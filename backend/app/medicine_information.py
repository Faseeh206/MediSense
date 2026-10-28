"""Present Gemini's general information separately from extracted directions."""
def medicine_information_context(medicines):
    contexts = []
    for medicine in medicines:
        info = medicine.get('patient_information') or {}
        status = 'ready' if info.get('identification') == 'recognized' else 'uncertain' if info else 'unavailable'
        name = medicine.get('brand_name') or medicine.get('generic_name') or 'Medicine'
        note = ('This medicine could not be identified confidently. Confirm the name and ingredient with a pharmacist.'
                if status == 'uncertain' else 'A general medicine explanation was not provided. The extracted prescription details are still available.')
        contexts.append({'provider': 'ai', 'source': 'Medicine insights', 'verification_status': 'not_independently_verified',
                         'medicine_name': name, 'generic_name': medicine.get('generic_name') or '',
                         'found': status == 'ready', 'information_status': status,
                         'patient_information': info if status == 'ready' else {},
                         'note': (info.get('uncertainty') or note) if status != 'ready' else ''})
    if not contexts:
        return {'provider': 'ai', 'found': False, 'information_status': 'not_applicable', 'patient_information': {}, 'note': 'No medicine was identified in this document.'}
    primary = next((item for item in contexts if item['found']), contexts[0])
    return {**primary, 'medications': contexts} if len(contexts) > 1 else primary
