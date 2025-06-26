import Link from 'next/link';
import ScheduledSendsList from '../components/dash-comp/scheduledSends';
import SummaryCards from '../components/dash-comp/summaryCards';

export default function Dashboard() {
  return (
    <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-3">
      {/* Left Column */}
      <div className="space-y-4 md:col-span-2">
        <SummaryCards />

        {/* Scheduled Sends */}
        <div className="mt-6 rounded-2xl bg-white p-4 shadow dark:bg-gray-900">
          <h2 className="mb-4 text-lg font-semibold text-gray-800 dark:text-gray-100">
            📅 Upcoming Scheduled Sends
          </h2>
          <ScheduledSendsList />
        </div>
      </div>

      {/* Right Column */}
      <div className="space-y-4">
        <div className="rounded-2xl bg-white p-4 shadow dark:bg-gray-900">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
            📨 Send a New Message
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            Quickly send out a bulk SMS to your contacts.
          </p>
          <Link
            href="/send"
            className="mt-4 inline-block w-full rounded-lg bg-purple-600 px-4 py-2 text-center text-white hover:bg-purple-700"
          >
            Go to Send Page
          </Link>
        </div>
      </div>
    </div>
  );
}
