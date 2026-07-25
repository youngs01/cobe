export default function handler(_req, res) {
  res.status(410).json({ error: 'Removed' });
}
