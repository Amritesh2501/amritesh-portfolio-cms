"use client";

import dynamic from "next/dynamic";

/**
 * The command palette and the chat widget, loaded after the page is
 * interactive rather than hydrated with it. Neither shows anything until it is
 * asked for (a shortcut, a click on a corner button), so shipping and running
 * them during load was pure blocking time.
 */
export const CommandPalette = dynamic(() => import("./CommandPalette").then((m) => m.CommandPalette), {
  ssr: false,
});

export const ChatBot = dynamic(() => import("./ChatBot").then((m) => m.ChatBot), { ssr: false });
