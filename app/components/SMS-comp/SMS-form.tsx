'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { fetchTemplates } from '../../lib/templates';
import { useAuthStore } from '../../lib/WithAuth/AuthStore';
import useSWR from 'swr';
import axios from 'axios';
import { CalendarClock } from 'lucide-react';
import TemplateDropdown from '../template/templateDrop';
import ContactGroupSelector from './ContactSelcector';
import { smsFormSchema, SmsFormValues } from '../../lib/schema/sms';

export default function SmsForm() {
  const [feedback, setFeedback] = useState('');
  const initialized = useAuthStore((s) => s.initialized);

  const {
    data: templates = [],
    isLoading: loadingTemplates,
    error: templatesError,
  } = useSWR(initialized ? 'templates' : null, fetchTemplates);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SmsFormValues>({
    resolver: zodResolver(smsFormSchema),
    defaultValues: {
      manualNumbers: '',
      message: '',
      scheduledAt: '',
      selectedGroup: [],
    },
  });

  const selectedGroup = watch('selectedGroup');

  const onSubmit = async (data: SmsFormValues) => {
    const manualList =
      data.manualNumbers
        ?.split(/[\n,]+/)
        .map((n) => n.trim())
        .filter(Boolean) ?? [];

    if (
      !data.message.trim() ||
      (manualList.length === 0 && selectedGroup.length === 0)
    ) {
      setFeedback(
        'Message and at least one phone number or group is required.',
      );
      return;
    }

    try {
      const res = await axios.post('/api/send-sms', {
        to_number: manualList,
        message: data.message,
        scheduledAt: data.scheduledAt || null,
        contact_group_ids: selectedGroup.length > 0 ? selectedGroup : null,
      });

      if (res.status !== 200) {
        throw new Error(res.data?.error || 'Failed to send SMS');
      }

      setFeedback('Message queued successfully!');
      reset({
        manualNumbers: '',
        message: '',
        scheduledAt: '',
        selectedGroup: [],
      });
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Unexpected error occurred';
      setFeedback(`${msg}`);
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-6 rounded-xl bg-slate-950 p-6 text-gray-200 shadow-xl"
    >
      <ContactGroupSelector
        selectedGroup={selectedGroup}
        onChange={(groupIds) =>
          setValue('selectedGroup', groupIds, { shouldValidate: true })
        }
      />

      <div>
        <label className="mb-2 block text-sm font-medium text-gray-500">
          Phone Numbers
        </label>
        <textarea
          {...register('manualNumbers')}
          placeholder="Enter phone numbers separated by commas or new lines"
          className="w-full rounded-lg bg-gray-900 px-4 py-3 text-sm text-white placeholder-gray-400 outline-none focus:ring-2 focus:ring-pink-900"
          rows={5}
        />
        {errors.manualNumbers && (
          <p className="text-sm text-red-400">{errors.manualNumbers.message}</p>
        )}

        <TemplateDropdown
          templates={templates}
          loading={loadingTemplates}
          onSelect={(template) => setValue('message', template.content)}
          error={templatesError}
        />

        <label className="mt-4 mb-2 block text-sm font-medium text-gray-500">
          Message
        </label>
        <textarea
          {...register('message')}
          required
          className="w-full rounded-lg bg-gray-900 p-3 text-white placeholder-gray-400 outline-none focus:ring-2 focus:ring-pink-900"
          rows={5}
          placeholder="Type your message here..."
        />
        {errors.message && (
          <p className="text-sm text-red-400">{errors.message.message}</p>
        )}

        <label className="mt-4 mb-2 flex items-center gap-2 text-sm font-medium text-gray-500">
          <CalendarClock size={20} /> Schedule for
        </label>
        <input
          type="datetime-local"
          {...register('scheduledAt')}
          className="w-full rounded-md bg-[#1a1a1a] p-2 text-white outline-none focus:ring-2 focus:ring-pink-900"
        />
      </div>

      {feedback && (
        <p
          className={`font-medium ${
            feedback.includes('✅') ? 'text-green-400' : 'text-red-400'
          }`}
        >
          {feedback}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full cursor-pointer rounded-lg bg-pink-900 py-3 font-semibold text-white transition duration-150 ease-in-out hover:bg-pink-800 focus:ring-2 focus:ring-pink-500 focus:outline-none active:scale-95 active:bg-pink-950 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSubmitting ? 'Sending...' : 'Send SMS'}
      </button>
    </form>
  );
}
