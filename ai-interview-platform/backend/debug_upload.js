import fs from 'fs';

const filePath = './test_resume.pdf';
const pdf = '%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 144] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n4 0 obj\n<< /Length 45 >>\nstream\nBT /F1 18 Tf 50 80 Td (John Doe) Tj ET\nendstream\nendobj\n5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\nxref\n0 6\n0000000000 65535 f \n0000000010 00000 n \n0000000062 00000 n \n0000000123 00000 n \n0000000245 00000 n \n0000000378 00000 n \n0000000451 00000 n \ntrailer\n<< /Root 1 0 R /Size 6 >>\nstartxref\n515\n%%EOF\n';
fs.writeFileSync(filePath, pdf);

const form = new FormData();
form.append('resume', new File([fs.readFileSync(filePath)], 'test_resume.pdf', { type: 'application/pdf' }));
form.append('targetRole', 'Frontend Developer');

const response = await fetch('http://localhost:5000/api/resume/upload', {
  method: 'POST',
  body: form,
});

console.log('STATUS', response.status);
const text = await response.text();
console.log(text);
