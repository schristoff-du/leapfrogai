import { afterAll, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { fakeThreads, getFakeFiles } from '$testUtils/fakeData';
import {
  mockChatCompletion,
  mockGetAssistants,
  mockNewMessage,
  mockNewThreadError
} from '$lib/mocks/chat-mocks';
import { load } from './+page';
import { mockOpenAI } from '../../../../../vitest-setup';
import ChatPageWithToast from './ChatPageWithToast.test.svelte';
import type { LFThread } from '$lib/types/threads';
import type { LFAssistant } from '$lib/types/assistants';
import type { FileObject } from 'openai/resources/files';
import { mockGetFiles } from '$lib/mocks/file-mocks';

type PageServerLoad = {
  threads: LFThread[];
  assistants: LFAssistant[];
  files: FileObject[];
} | null;
let data: PageServerLoad;
const question = 'What is AI?';

const files = getFakeFiles();

describe('when there is NO active thread selected', () => {
  beforeEach(async () => {
    const allMessages = fakeThreads.flatMap((thread) => thread.messages);
    mockGetAssistants();
    mockGetFiles(files);
    mockOpenAI.setThreads(fakeThreads);
    mockOpenAI.setMessages(allMessages);
    mockOpenAI.setFiles(files);

    data = await load({
      params: {},
      fetch: global.fetch,
      depends: vi.fn()
    });
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  it('displays an error message when there is an error saving the new thread', async () => {
    mockChatCompletion();
    mockNewThreadError();
    mockNewMessage();

    const { getByLabelText } = render(ChatPageWithToast, { data });

    const input = getByLabelText('message input') as HTMLInputElement;
    const submitBtn = getByLabelText('send');

    await userEvent.type(input, question);
    await userEvent.click(submitBtn);
    await screen.findAllByText('Error saving thread.');
  });
});
