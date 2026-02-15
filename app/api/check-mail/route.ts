import { NextRequest, NextResponse } from "next/server"

interface MockEmail {
  id: string
  from: string
  subject: string
  date: string
  body: string
}

const mockEmails: Record<string, MockEmail[]> = {
  tony: [
    {
      id: "1",
      from: "Amazon Orders",
      subject: "Your order #1284-9921 has shipped!",
      date: "2 min ago",
      body: "<p>Hi Tony,</p><p>Your order has been shipped and is on its way! You can track your package using the link below.</p><p><strong>Order #1284-9921</strong><br/>Estimated delivery: Feb 18, 2026</p><p>Thank you for shopping with us.</p>",
    },
    {
      id: "2",
      from: "GitHub",
      subject: "[GitHub] A new sign-in to your account",
      date: "15 min ago",
      body: "<p>Hey tony,</p><p>A new sign-in was detected on your GitHub account from <strong>Chrome on macOS</strong>.</p><p>If this was you, no further action is needed. If you did not sign in, please secure your account immediately.</p>",
    },
    {
      id: "3",
      from: "Spotify",
      subject: "Your weekly playlist is ready!",
      date: "1 hour ago",
      body: "<p>Hi Tony,</p><p>Your <strong>Discover Weekly</strong> playlist has been updated with 30 fresh tracks just for you. Start listening now and find your next favorite song.</p><p>Enjoy the music!</p>",
    },
  ],
  demo: [
    {
      id: "4",
      from: "Vercel Team",
      subject: "Welcome to Vercel!",
      date: "5 min ago",
      body: "<p>Welcome to the Vercel platform! We're thrilled to have you on board.</p><p>Deploy your first project in minutes and experience the power of serverless deployment.</p>",
    },
  ],
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const user = searchParams.get("user")

  if (!user) {
    return NextResponse.json({ error: "User parameter is required" }, { status: 400 })
  }

  // Simulate a small network delay
  await new Promise((resolve) => setTimeout(resolve, 800))

  const emails = mockEmails[user.toLowerCase()] || []

  return NextResponse.json({ emails, user })
}
