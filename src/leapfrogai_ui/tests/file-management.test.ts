import { expect, test } from './fixtures';
import { getTableRow, getSimpleMathQuestion, loadChatPage } from './helpers/helpers';
import {
  confirmDeletion,
  createExcelFile,
  createPDF,
  createPowerpointFile,
  createTextFile,
  createWordFile,
  deleteFileByName,
  deleteFixtureFile,
  deleteTestFilesWithApi,
  initiateDeletion,
  loadFileManagementPage,
  testFileUpload,
  uploadFile
} from './helpers/fileHelpers';
import { sendMessage } from './helpers/threadHelpers';

test.beforeEach(async ({ openAIClient }) => {
  await deleteTestFilesWithApi(openAIClient);
});

test('it can navigate to the last visited thread with breadcrumbs', async ({ page }) => {
  const newMessage = getSimpleMathQuestion();
  await page.goto('/chat');
  await sendMessage(page, newMessage);
  const messages = page.getByTestId('message');
  await expect(messages).toHaveCount(2);

  const urlParts = new URL(page.url()).pathname.split('/');
  const threadId = urlParts[urlParts.length - 1];

  await page.getByLabel('Settings').click();
  await page.getByText('File Management').click();
  await page.getByRole('link', { name: 'Chat' }).click();
  await page.waitForURL(`/chat/${threadId}`);
});

test('it can navigate to the file management page', async ({ page }) => {
  await loadChatPage(page);

  await page.getByLabel('Settings').click();
  await page.getByText('File Management').click();

  await expect(page).toHaveTitle('LeapfrogAI - File Management');
});

test('it can upload a pdf file', async ({ page, openAIClient }) => {
  const filename = await createPDF();
  await testFileUpload(filename, page, openAIClient);
});

test('it can upload a .txt file', async ({ page, openAIClient }) => {
  const filename = createTextFile();
  await testFileUpload(filename, page, openAIClient);
});

test('it can upload a .text file', async ({ page, openAIClient }) => {
  const filename = createTextFile({ extension: '.text' });
  await testFileUpload(filename, page, openAIClient);
});

test('it can upload a .docx word file', async ({ page, openAIClient }) => {
  const filename = createWordFile();
  await testFileUpload(filename, page, openAIClient);
});

test('it can upload a .doc word file', async ({ page, openAIClient }) => {
  const filename = createWordFile({ extension: '.doc' });
  await testFileUpload(filename, page, openAIClient);
});

test('it can upload a .xlsx excel file', async ({ page, openAIClient }) => {
  const filename = createExcelFile();
  await testFileUpload(filename, page, openAIClient);
});

test('it can upload a .xls excel file', async ({ page, openAIClient }) => {
  const filename = createExcelFile({ extension: '.xls' });
  await testFileUpload(filename, page, openAIClient);
});

// pptxgenjs library not capable of creating .ppt files, so only testing .pptx
test('it can upload a .pptx powerpoint file', async ({ page, openAIClient }) => {
  const filename = await createPowerpointFile();
  await testFileUpload(filename, page, openAIClient);
});

test('confirms any affected assistants then deletes multiple files', async ({
  page,
  openAIClient
}) => {
  await loadFileManagementPage(page);

  const filename1 = await createPDF();
  const filename2 = await createPDF();

  await uploadFile(page, filename1);
  await expect(page.getByText(`${filename1} imported successfully`)).toBeVisible();
  await expect(page.getByText(`${filename1} imported successfully`)).not.toBeVisible(); // wait for upload to finish
  await uploadFile(page, `${filename2}`);
  await expect(page.getByText(`${filename2} imported successfully`)).toBeVisible();
  await expect(page.getByText(`${filename2} imported successfully`)).not.toBeVisible();

  const row1 = await getTableRow(page, filename1);
  const row2 = await getTableRow(page, filename2);
  expect(row1).not.toBeNull();
  expect(row2).not.toBeNull();

  await row1!.getByRole('checkbox').check({ force: true });
  await row2!.getByRole('checkbox').check({ force: true });
  await initiateDeletion(page, `${filename1}, ${filename2}`);
  await confirmDeletion(page);

  await expect(page.getByText('Files Deleted')).toBeVisible();

  // cleanup
  deleteFixtureFile(filename1);
  deleteFixtureFile(filename2);
  await deleteFileByName(filename1, openAIClient);
  await deleteFileByName(filename2, openAIClient);
});

test('it cancels the delete confirmation modal', async ({ page, openAIClient }) => {
  await loadFileManagementPage(page);

  const filename = await createPDF();

  await uploadFile(page, filename);
  await expect(page.getByText(`${filename} imported successfully`)).toBeVisible();
  await expect(page.getByText(`${filename} imported successfully`)).not.toBeVisible(); // wait for upload to finish

  const row = await getTableRow(page, filename);
  expect(row).not.toBeNull();
  await row!.getByRole('checkbox').check({ force: true });

  await initiateDeletion(page, filename);

  const cancelBtn = page.getByRole('dialog').getByRole('button', { name: 'Cancel' });
  await cancelBtn.click();
  await expect(page.getByText(`Are you sure you want to delete ${filename}`)).not.toBeVisible();

  // Cleanup
  deleteFixtureFile(filename);
  await deleteFileByName(filename, openAIClient);
});

test('shows an error toast when there is an error deleting a file', async ({
  page,
  openAIClient
}) => {
  const filename = await createPDF();

  let hasBeenCalled = false;
  await page.route('*/**/api/files/delete', async (route) => {
    if (!hasBeenCalled && route.request().method() === 'DELETE') {
      if (!hasBeenCalled && route.request().method() === 'DELETE') {
        hasBeenCalled = true;
        await route.fulfill({ status: 500 });
      } else {
        const response = await route.fetch();
        await route.fulfill({ response });
      }
    }
  });
  await loadFileManagementPage(page);
  await uploadFile(page, filename);

  await expect(page.getByText(`${filename} imported successfully`)).toBeVisible();
  await expect(page.getByText(`${filename} imported successfully`)).not.toBeVisible(); // wait for upload to finish

  const row = await getTableRow(page, filename);
  expect(row).not.toBeNull();
  await row!.getByRole('checkbox').check({ force: true });

  await initiateDeletion(page, filename);
  await confirmDeletion(page);

  await expect(page.getByText('Error Deleting File')).toBeVisible();

  // Cleanup
  deleteFixtureFile(filename);
  await deleteFileByName(filename, openAIClient);
});

test('it shows toast when there is an error submitting the form', async ({
  page,
  openAIClient
}) => {
  await page.route('*/**/chat/file-management', async (route) => {
    if (route.request().method() === 'POST') {
      const json = {};

      await route.fulfill({ json });
    } else {
      const response = await route.fetch();
      await route.fulfill({ response });
    }
  });

  await loadFileManagementPage(page);

  const filename = await createPDF();

  await uploadFile(page, filename);

  await expect(page.getByText('Import Failed')).toBeVisible();

  // Cleanup
  deleteFixtureFile(filename);
  await deleteFileByName(filename, openAIClient);
});
