import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const { name, email, company, message } = body;

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: "Name, email and message are required." },
        { status: 400 }
      );
    }

    const sender = {
      name: "WageFlow",
      email: process.env.BREVO_FROM_EMAIL,
    };

    const internalEmail = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": process.env.BREVO_API_KEY as string,
      },
      body: JSON.stringify({
        sender,
        to: [
          {
            email: process.env.BREVO_TO_EMAIL,
          },
        ],
        replyTo: {
          email,
          name,
        },
        subject: "New WageFlow Inquiry",
        htmlContent: `
          <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>New WageFlow Inquiry</h2>

            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Company:</strong> ${company || "Not provided"}</p>

            <p><strong>Message:</strong></p>
            <p>${message}</p>
          </div>
        `,
      }),
    });

    if (!internalEmail.ok) {
      const error = await internalEmail.text();
      return NextResponse.json({ error }, { status: 500 });
    }

    const autoResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": process.env.BREVO_API_KEY as string,
      },
      body: JSON.stringify({
        sender,
        to: [
          {
            email,
            name,
          },
        ],
        subject: "We have received your WageFlow inquiry",
        htmlContent: `
  <div style="font-family: Arial, sans-serif; padding: 20px; line-height: 1.6; color: #111827;">
    
    <p>Hi ${name},</p>

    <p>
      Thank you for contacting <strong>WageFlow</strong>.
    </p>

    <p>
      This is an automated confirmation that we have received your email.
      A member of our team will review your message and get back to you shortly.
    </p>

    <div style="margin-top: 24px; margin-bottom: 24px;">
      <p style="margin: 0;">
        <strong>Operating Hours</strong>
      </p>

      <p style="margin: 4px 0 0 0;">
        Monday – Friday | 08:00 – 17:00
      </p>
    </div>

    <p>
      Please note that we are closed on weekends and public holidays.
      Emails received outside of business hours will be attended to on the next available working day.
    </p>

    <p>
      If your matter is urgent, please include
      <strong>URGENT</strong> in the subject line of your reply and we will prioritise your request.
    </p>

    <p>
      We appreciate your patience and look forward to assisting you.
    </p>

    <div style="margin-top: 32px;">
      <p style="margin-bottom: 4px;">
        Kind regards,
      </p>

      <p style="margin: 0;">
        <strong>WageFlow</strong><br />
        A product of Lesedi Smart Solutions
      </p>
    </div>

  </div>
`,
      }),
    });

    if (!autoResponse.ok) {
      const error = await autoResponse.text();
      return NextResponse.json({ error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Something went wrong.",
      },
      {
        status: 500,
      }
    );
  }
}