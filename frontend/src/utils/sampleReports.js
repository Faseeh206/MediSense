// Bundled examples mirror backend/app/sample_data.py and its existing specialist
// rules. Opening an example never uploads a document or creates a scan record.
export async function getSampleReport(key) {
    const { default: reports } = await import('../data/sampleReports.js');
    if (!Object.hasOwn(reports, key)) throw new Error('Unknown sample report');
    return structuredClone(reports[key]);
}
