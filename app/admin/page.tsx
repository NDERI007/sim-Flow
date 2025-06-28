import Link from 'next/link';
import { CalendarClock, Send } from 'lucide-react';
import ScheduledSendsList from '../components/dash-comp/scheduledSends';
import SummaryCards from '../components/dash-comp/summaryCards';

export default function Dashboard() {
  return (
    <div className="grid grid-cols-1 gap-6 p-4 lg:grid-cols-3">
      {/* Left Column */}
      <div className="space-y-4 lg:col-span-2">
        <SummaryCards />

        {/* Scheduled Sends */}
        <div className="mt-6 rounded-2xl bg-white p-4 shadow dark:bg-gray-900">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-800 dark:text-gray-100">
            <CalendarClock className="h-5 w-5 text-pink-900" /> Upcoming
            Scheduled Sends
          </h2>
          <ScheduledSendsList />
        </div>
      </div>

      {/* Right Column */}
      <div className="w-full space-y-4 lg:max-w-sm">
        <div className="rounded-2xl bg-white p-6 shadow dark:bg-gray-900">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
            Send a New Message
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            Quickly send out a bulk SMS to your contacts.
          </p>
          <Link
            href="/send"
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-pink-900 px-4 py-2 text-center text-white transition hover:bg-pink-800"
          >
            Go to Send Page <Send className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
