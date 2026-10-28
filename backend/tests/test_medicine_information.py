import unittest
from app.schemas import Medicine
from app.medicine_information import medicine_information_context


class MedicineInformationTests(unittest.TestCase):
    def test_recognized_medicines_keep_individual_information_without_source_verification_claims(self):
        medicines = [Medicine.model_validate({'brand_name': name, 'patient_information': {'identification': 'recognized', 'uses': name + ' synthetic use.'}}).model_dump() for name in ['First', 'Second']]
        context = medicine_information_context(medicines)
        self.assertEqual(len(context['medications']), 2)
        for index, name in enumerate(['First', 'Second']):
            item = context['medications'][index]
            self.assertEqual(item['provider'], 'ai')
            self.assertEqual(item['medicine_name'], name)
            self.assertEqual(item['information_status'], 'ready')
            self.assertEqual(item['verification_status'], 'not_independently_verified')
            self.assertEqual(item['patient_information']['uses'], name + ' synthetic use.')
            self.assertNotIn('source_url', item)

    def test_uncertain_identity_does_not_display_guessed_medical_details(self):
        medicine = Medicine.model_validate({'brand_name': 'Unknown synthetic brand', 'patient_information': {'identification': 'uncertain', 'uses': 'Unreliable claim', 'uncertainty': 'Name cannot be confidently identified.'}}).model_dump()
        self.assertEqual(medicine['patient_information']['uses'], '')
        context = medicine_information_context([medicine])
        self.assertFalse(context['found'])
        self.assertEqual(context['information_status'], 'uncertain')
        self.assertEqual(context['patient_information'], {})

    def test_missing_malformed_or_excessive_information_does_not_discard_extracted_directions(self):
        for info in [None, 'invalid', {'identification': 'recognized', 'uses': 'word ' * 161}, {'identification': 'recognized'}]:
            medicine = Medicine.model_validate({'brand_name': 'Synthetic', 'dosage': 'original strength', 'frequency_instructions': 'original directions', 'patient_information': info}).model_dump()
            self.assertEqual(medicine['frequency_instructions'], 'original directions')
            self.assertEqual(medicine['dosage'], 'original strength')
            self.assertIsNone(medicine['patient_information'])
            self.assertEqual(medicine_information_context([medicine])['information_status'], 'unavailable')

    def test_no_medicine_needs_no_external_lookup(self):
        self.assertEqual(medicine_information_context([])['information_status'], 'not_applicable')


if __name__ == '__main__':
    unittest.main()
