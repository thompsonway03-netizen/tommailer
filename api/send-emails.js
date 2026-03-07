const nodemailer = require('nodemailer');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { senders, recipients, subject, body, replyTo } = req.body;
  if (!senders || !recipients || !subject || !body) {
    return res.status(400).json({ message: 'Missing fields' });
  }

  const sender = senders[0];
  const recipient = recipients[0];

  try {
    const transporter = nodemailer.createTransport({
      host: sender.host,
      port: parseInt(sender.port),
      secure: sender.port === '465',
      auth: {
        user: sender.user,
        pass: sender.pass,
      },
    });

    await transporter.verify();
    const mailOptions = {
      from: sender.user,
      to: recipient,
      subject,
      text: body,
    };
    if (replyTo) mailOptions.replyTo = replyTo;
    await transporter.sendMail(mailOptions);
    return res.json({ status: 'success', message: `Email sent to ${recipient}` });
  } catch (error) {
    console.error(`[SMTP ERROR] ${error.message}`);
    return res.status(500).json({ status: 'error', message: error.message });
  }
};