'use client';

import { useState } from 'react';
import { Copy } from 'lucide-react';
import { toast } from 'sonner';
import Modal from './modal';
import InfoPopover from './InfoPop';

export function SenderIdInfo() {
  const [isOpen, setIsOpen] = useState(false);

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  return (
    <>
      <div className="flex w-full items-center rounded bg-zinc-800 px-4 py-3 text-sm text-zinc-300">
        <div className="flex flex-wrap items-center gap-1">
          <span className="font-medium text-white">
            Please alert us for Sender ID
            <InfoPopover text="Sender ID is a unique name (like 'MyCompany') that appears as the sender of your SMS messages. To use one, you must go through an approval process with Onfon, and even if you already have a Sender ID, it must be officially transferred to be compatible with our system. Please contact us to request or transfer your Sender ID." />{' '}
            setup after completing registration
          </span>
          <button
            onClick={() => setIsOpen(true)}
            className="text-indigo-400 underline hover:text-indigo-300"
          >
            Contact us
          </button>
          .
        </div>
      </div>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)}>
        <h2 className="mb-4 text-lg font-semibold text-indigo-400">
          Contact Us for Sender ID Setup
        </h2>
        <ul className="space-y-3 text-sm">
          <li className="flex items-center justify-between">
            <span>Email: support@yourdomain.com</span>
            <button
              onClick={() => copyToClipboard('support@yourdomain.com')}
              className="text-indigo-400 hover:text-indigo-300"
            >
              <Copy className="h-4 w-4" />
            </button>
          </li>

          <li className="flex items-center justify-between">
            <span>Phone: 0790504636</span>
            <button
              onClick={() => copyToClipboard('0790504636')}
              className="text-indigo-400 hover:text-indigo-300"
            >
              <Copy className="h-4 w-4" />
            </button>
          </li>
        </ul>

        <div className="mt-6 text-right">
          <button
            onClick={() => setIsOpen(false)}
            className="rounded bg-indigo-600 px-4 py-2 text-sm hover:bg-indigo-700"
          >
            Close
          </button>
        </div>
      </Modal>
    </>
  );
}
