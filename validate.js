// Server-side validation: the source of truth. Never trust the client.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^\+?[0-9 ()-]{7,20}$/;

export function validateApplication(body) {
  const errors = {};
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return { errors: { _form: 'Body must be a JSON object' } };
  }
  const str = (v) => (typeof v === 'string' ? v.trim() : '');

  const name = str(body.name);
  const email = str(body.email).toLowerCase();
  const phone = str(body.phone);
  const resumeUrl = str(body.resumeUrl);
  const coverLetter = str(body.coverLetter);
  const internshipId = body.internshipId;

  if (name.length < 2 || name.length > 80) errors.name = 'Name must be 2-80 characters';
  if (!EMAIL_RE.test(email) || email.length > 120) errors.email = 'Enter a valid email address';
  if (phone && !PHONE_RE.test(phone)) errors.phone = 'Enter a valid phone number';
  if (resumeUrl) {
    try {
      const u = new URL(resumeUrl);
      if (u.protocol !== 'https:' || resumeUrl.length > 300) throw new Error();
    } catch {
      errors.resumeUrl = 'Resume link must be a valid https URL';
    }
  }
  if (coverLetter.length < 20 || coverLetter.length > 1000) {
    errors.coverLetter = 'Cover letter must be 20-1000 characters';
  }
  if (!Number.isInteger(internshipId) || internshipId < 1) {
    errors.internshipId = 'Choose a valid internship';
  }

  return { errors, value: { name, email, phone, resumeUrl, coverLetter, internshipId } };
}
