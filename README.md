This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

# 📡 SendSMS Gateway

A fast, reliable, and developer-friendly SMS gateway built with **Next.js**, **BullMQ**, and **ioredis**.

## 🚀 Overview

SendSMS Gateway is designed to help **businesses** easily send bulk SMS to their clients — whether for marketing, notifications, or alerts — with **minimal setup** and **maximum reliability**.

This gateway abstracts away the hassle of rate-limiting, queuing, retries, and third-party SMS provider integration, making it perfect for teams who want a plug-and-play solution.

## 🏗️ Tech Stack

- **Next.js** – API endpoints and frontend
- **BullMQ** – Task queue for managing SMS delivery jobs
- **ioredis** – Redis client used for storing queues and job states
- **Upstash Redis** – Queue backend
- **Third-party SMS provider** – Onfon, for actual SMS delivery

## ✨ Features

- 📤 Send SMS to individual or multiple contacts
- 📋 Contact group management
- ⏱️ Queue-based delivery with retries
- 📊 Track job status (pending, completed, failed)
- ⚙️ Easy to integrate into your business or existing app
- 🔐 Auth-ready (can be extended to support RBAC)
- 📱 Built for scale — handles thousands of messages

## 🧠 Use Case

Perfect for:

- Small-to-medium businesses needing affordable SMS outreach
- CRM tools integrating SMS follow-ups
- Schools, health centers, or SACCOs sending timely notifications
- Developers who want full control over queue-based SMS dispatching

Made with 💜 for teams who just want to send that SMS. ## Psalms 118:24
