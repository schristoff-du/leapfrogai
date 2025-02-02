import { actions } from './+page.server';
import { sessionMock, sessionNullMock } from '$lib/mocks/supabase-mocks';
import { mockCreateApiKey, mockCreateApiKeyError } from '$lib/mocks/api-key-mocks';
import { faker } from '@faker-js/faker';
import { superValidate } from 'sveltekit-superforms';
import { yup } from 'sveltekit-superforms/adapters';
import { newAPIKeySchema } from '$schemas/apiKey';
import type { NewApiKeyInput } from '$lib/types/apiKeys';

describe('api keys form action', () => {
  it('returns a 401 if the request is unauthenticated', async () => {
    const request = new Request('https://thisurldoesntmatter', {
      method: 'POST'
    });
    const res = await actions.default({
      request,
      locals: { safeGetSession: sessionNullMock }
    });

    expect(res?.status).toEqual(401);
  });

  it('returns a 400 if the request data is invalid', async () => {
    const request = new Request('https://thisurldoesntmatter', {
      method: 'POST'
    });

    const res = await actions.default({ request, locals: { safeGetSession: sessionMock } });
    expect(res?.status).toEqual(400);
  });
  it('returns the created key', async () => {
    mockCreateApiKey();

    const newApiKeyInput: NewApiKeyInput = {
      name: faker.word.noun(),
      expires_at: new Date().getTime()
    };
    const formData = new FormData();
    formData.append('name', newApiKeyInput.name);
    formData.append('expires_at', newApiKeyInput.expires_at.toString());

    const form = await superValidate(yup(newAPIKeySchema));
    form.data = newApiKeyInput;
    const request = new Request('https://thisurldoesntmatter', {
      method: 'POST',
      body: formData
    });
    const res = await actions.default({
      request,
      locals: { safeGetSession: sessionMock }
    });

    expect(res.key).toBeDefined();
    expect(res.key.api_key.startsWith('lfai_')).toEqual(true);
  });
  it('returns a 500 status if there is error with the create api call', async () => {
    mockCreateApiKeyError();

    const newApiKeyInput: NewApiKeyInput = {
      name: faker.word.noun(),
      expires_at: new Date().getTime()
    };
    const formData = new FormData();
    formData.append('name', newApiKeyInput.name);
    formData.append('expires_at', newApiKeyInput.expires_at.toString());

    const form = await superValidate(yup(newAPIKeySchema));
    form.data = newApiKeyInput;
    const request = new Request('https://thisurldoesntmatter', {
      method: 'POST',
      body: formData
    });

    const res = await actions.default({
      request,
      locals: { safeGetSession: sessionMock }
    });

    expect(res.status).toEqual(500);
  });
});
