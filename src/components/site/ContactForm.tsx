"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { contactSchema, type ContactInput } from "@/lib/resources";
import { submitContact } from "@/actions/contact";

export function ContactForm() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ContactInput>({
    resolver: zodResolver(contactSchema),
    defaultValues: { name: "", email: "", subject: "", message: "", website: "" },
  });

  async function onSubmit(values: ContactInput) {
    setServerError(null);
    setSent(null);

    // The same Zod schema runs again server-side. This client pass is only for
    // fast feedback; it is not the validation that matters.
    const result = await submitContact(values);

    if (!result.ok) {
      if (result.fieldErrors) {
        for (const [field, messages] of Object.entries(result.fieldErrors)) {
          setError(field as keyof ContactInput, { message: messages[0] });
        }
      }
      setServerError(result.error ?? "Could not send the message.");
      return;
    }

    setSent(result.message ?? "Message received.");
    reset();
  }

  if (sent) {
    return (
      <div
        role="status"
        className="card border-[var(--accent)] p-8 sm:p-10"
      >
        <p className="t-display text-[1.75rem] text-[var(--fg)]">Sent</p>
        <p className="mt-4 max-w-[48ch] text-[0.9375rem] leading-relaxed text-[var(--muted)]">
          {sent}
        </p>
        <button
          type="button"
          className="btn btn-sm mt-6"
          onClick={() => setSent(null)}
        >
          Send another
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-5">
      {/* Honeypot. Hidden from people and from screen readers, visible to bots. */}
      <div aria-hidden className="absolute h-0 w-0 overflow-hidden opacity-0">
        <label htmlFor="website">Website</label>
        <input id="website" tabIndex={-1} autoComplete="off" {...register("website")} />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          id="name"
          label="Name"
          error={errors.name?.message}
          {...register("name")}
        />
        <Field
          id="email"
          label="Email"
          type="email"
          error={errors.email?.message}
          {...register("email")}
        />
      </div>

      <Field
        id="subject"
        label="Subject"
        error={errors.subject?.message}
        {...register("subject")}
      />

      <div className="grid gap-2">
        <label htmlFor="message" className="t-label text-[var(--fg)]">
          Message
        </label>
        <textarea
          id="message"
          rows={6}
          className="field"
          aria-invalid={errors.message ? "true" : "false"}
          aria-describedby={errors.message ? "message-error" : undefined}
          {...register("message")}
        />
        {errors.message ? (
          <p id="message-error" role="alert" className="text-[0.8125rem] text-[var(--accent)]">
            {errors.message.message}
          </p>
        ) : null}
      </div>

      {serverError ? (
        <p
          role="alert"
          className="rounded-[var(--r-sm)] border border-[var(--accent)] bg-[var(--accent-soft)] px-4 py-3 text-[0.875rem] text-[var(--accent)]"
        >
          {serverError}
        </p>
      ) : null}

      <div>
        <button type="submit" className="btn btn-accent" disabled={isSubmitting}>
          {isSubmitting ? "Sending" : "Send message"}
        </button>
      </div>
    </form>
  );
}

// React 19 passes `ref` as an ordinary prop, so ComponentProps<"input">
// carries it through to the real input without forwardRef.
function Field({
  id,
  label,
  error,
  type = "text",
  ...props
}: React.ComponentProps<"input"> & {
  id: string;
  label: string;
  error?: string;
}) {
  return (
    <div className="grid gap-2">
      <label htmlFor={id} className="t-label text-[var(--fg)]">
        {label}
      </label>
      <input
        id={id}
        type={type}
        className="field"
        aria-invalid={error ? "true" : "false"}
        aria-describedby={error ? `${id}-error` : undefined}
        {...props}
      />
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-[0.8125rem] text-[var(--accent)]">
          {error}
        </p>
      ) : null}
    </div>
  );
};
