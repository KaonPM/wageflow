import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const { name, email, company, message } = body;

    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": process.env.BREVO_API_KEY as string,
      },
      body: JSON.stringify({
        sender: {
          name: "WageFlow",
          email: process.env.BREVO_FROM_EMAIL,
        },

        to: [
          {
            email: process.env.BREVO_TO_EMAIL,
          },
        ],

        subject: "New WageFlow Inquiry",

        htmlContent: `
          <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>New WageFlow Inquiry</h2>

            <p><strong>Name:</strong> ${name}</p>

            <p><strong>Email:</strong> ${email}</p>

            <p><strong>Company:</strong> ${company}</p>

            <p><strong>Message:</strong></p>

            <p>${message}</p>
          </div>
        `,
      }),
    });

    if (!response.ok) {
      const error = await response.text();

      return NextResponse.json(
        { error },
        { status: 500 }
      );
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