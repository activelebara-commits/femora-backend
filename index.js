const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' })); 
app.use(express.static('public'));
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const ADMIN_PIN = process.env.ADMIN_PIN;

app.post('/api/signup', async (req, res) => {
  const { name, email, phone, password } = req.body;
  const { error } = await supabase.from('profiles').insert([{ name, email, phone, password }]);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true });
});

app.post('/api/upload', async (req, res) => {
  const { email, base64Image } = req.body;
  const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");
  const buffer = Buffer.from(base64Data, 'base64');
  const fileName = `${Date.now()}-${email}.jpg`;
  const { error } = await supabase.storage.from('avatars').upload(fileName, buffer, { contentType: 'image/jpeg' });
  if (error) return res.status(400).json({ error: error.message });
  const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);
  await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('email', email);
  res.json({ success: true, avatar_url: publicUrl });
});

app.post('/api/admin-login', (req, res) => {
  if (req.body.pin === ADMIN_PIN) return res.json({ success: true });
  res.status(401).json({ error: 'Invalid PIN' });
});

app.get('/api/admin-users', async (req, res) => {
  const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

app.post('/api/admin-action', async (req, res) => {
  const { email, action } = req.body; 
  if (action === 'reject') {
    await supabase.from('profiles').delete().eq('email', email);
  } else {
    await supabase.from('profiles').update({ status: 'approved' }).eq('email', email);
  }
  res.json({ success: true });
});

if (process.env.NODE_ENV !== 'production') {
  app.listen(3000, () => console.log('Femora Backend Running'));
}
module.exports = app;
