// Publish only feedback for which the project owner has approval.
// Shape: { id, name, quote, role?, source?, approved: true }.
export const approvedReviews = [];

// Fictional demonstration content, displayed with an explicit sample label.
// These are never included in approvedReviews or presented as verified feedback.
export const sampleReviews = [
  { id: 'sample-ayesha', name: 'Ayesha Khan', username: '@ayesha.k', body: 'The lab terms finally made sense. I wrote down a few questions before calling my doctor. 📝' },
  { id: 'sample-hamza', name: 'Hamza Ali', username: '@hamza.ali', body: 'I used it to read my prescription. The simpler wording helped me follow the conversation at my appointment.' },
  { id: 'sample-fatima', name: 'Fatima Ahmed', username: '@fatima.a', body: 'I liked seeing the ranges explained beside each result, without having to look up every abbreviation. 🔎' },
  { id: 'sample-usman', name: 'Usman Tariq', username: '@usman.t', body: 'My report had several pages. Having the main points in one place made it easier to work through.' },
  { id: 'sample-maryam', name: 'Maryam Hassan', username: '@maryam.h', body: 'The medication explanation was useful. I still checked the details with my pharmacist before making any changes.' },
  { id: 'sample-bilal', name: 'Bilal Ahmed', username: '@bilal.a', body: 'Simple to upload a PDF, and the explanation was easy to read on my phone. That made a difference for me. 📱' },
  { id: 'sample-zainab', name: 'Zainab Malik', username: '@zainab.m', body: 'It helped me organise what I wanted to ask about my report. I felt more prepared for the appointment. 🗂️' },
];
