import { test, expect, type Page } from '@playwright/test';

const API = 'http://localhost:4000';
const TEST_EMAIL = 'test@example.com';
const TEST_PASSWORD = 'password123';
const TEST_NAME = 'Тест Тестов';

async function loginViaApi(page: Page) {
  const MAX_ATTEMPTS = 3;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      const loginRes = await page.request.post(`${API}/api/auth/login`, {
        data: { email: TEST_EMAIL, password: TEST_PASSWORD },
        timeout: 20000,
      });

      if (!loginRes.ok()) {
        const errBody = await loginRes.json().catch(() => ({}));
        throw new Error(`Login API ${loginRes.status()}: ${JSON.stringify(errBody)}`);
      }

      const loginData = await loginRes.json();
      const token = loginData.accessToken;
      if (!token) throw new Error('accessToken не получен: ' + JSON.stringify(loginData));

      await page.goto('/');
      await page.evaluate((t) => localStorage.setItem('cosmobook_access_token', t), token);
      await page.reload();

      const logoutBtn = page.getByRole('button', { name: /выйти/i });
      await logoutBtn.waitFor({ state: 'visible', timeout: 20000 });
      return;
    } catch (err) {
      if (attempt < MAX_ATTEMPTS - 1) {
        await page.waitForTimeout(1000);
      } else {
        throw new Error(`Не удалось войти после ${MAX_ATTEMPTS} попыток: ${(err as Error).message}`);
      }
    }
  }
}

test.describe('1. Регистрация и вход', () => {
  test('Пользователь входит в систему и попадает на страницу «Мои записи»', async ({ page }) => {
    await loginViaApi(page);
    await page.goto('/my-appointments');
    await expect(page.getByRole('heading', { name: 'Мои записи' })).toBeVisible();
  });

  test('Пользователь видит кнопку «Выйти» после входа', async ({ page }) => {
    await loginViaApi(page);
    await expect(page.getByText('Выйти')).toBeVisible();
  });
});

async function waitForServicesLoaded(page: Page) {
  await page.goto('/services');
  await expect(page.getByText('Загрузка услуг...')).toBeHidden({ timeout: 20000 });
  await expect(page.locator('article').first()).toBeVisible({ timeout: 5000 });
}

test.describe('2. Каталог услуг', () => {
  test('Пользователь просматривает каталог услуг', async ({ page }) => {
    await waitForServicesLoaded(page);
  });

  test('Пользователь фильтрует услуги по категории', async ({ page }) => {
    await waitForServicesLoaded(page);

    const allCount = await page.locator('article').count();

    const categorySelect = page.locator('select');
    const options = await categorySelect.locator('option').allTextContents();
    const categoryToSelect = options.find(o => o !== 'Все');
    if (!categoryToSelect) {
      test.skip(true, 'Нет категорий для фильтрации');
      return;
    }

    await categorySelect.selectOption({ label: categoryToSelect });
    await page.waitForTimeout(500);

    const filteredCount = await page.locator('article').count();
    expect(filteredCount).toBeLessThanOrEqual(allCount);
    expect(filteredCount).toBeGreaterThan(0);
  });

  test('Пользователь ищет услугу по названию', async ({ page }) => {
    await waitForServicesLoaded(page);

    const allCount = await page.locator('article').count();
    expect(allCount).toBeGreaterThan(0);

    const searchInput = page.getByPlaceholder('Поиск по названию');
    await searchInput.click();
    await page.keyboard.type('zzz_нет_такой');
    await page.waitForTimeout(500);

    const afterSearch = await page.locator('article').count();
    expect(afterSearch).toBe(0);
  });
});

test.describe('3. Запись на процедуру', () => {
  test.setTimeout(120000);
  test('Пользователь записывается через пошаговую форму и видит запись', async ({ page }) => {
    await loginViaApi(page);

    // Отменяем все активные записи, чтобы освободить слоты
    const myRes = await page.request.get(`${API}/api/appointments/my`, {
      headers: { Authorization: `Bearer ${await page.evaluate(() => localStorage.getItem('cosmobook_access_token'))}` },
    });
    if (myRes.ok()) {
      const { appointments = [] } = await myRes.json();
      for (const a of appointments) {
        if (a.status === 'pending' || a.status === 'confirmed') {
          await page.request.patch(`${API}/api/appointments/${a.id}/status`, {
            headers: { Authorization: `Bearer ${await page.evaluate(() => localStorage.getItem('cosmobook_access_token'))}` },
            data: { status: 'cancelled' },
          });
        }
      }
    }

    await page.goto('/booking');

    // Шаг 1
    await page.locator('select').first().selectOption({ index: 1 });
    await page.getByRole('button', { name: /далее/i }).click();

    // Шаг 2 — выбираем предпоследний день и случайный временной слот
    await page.getByText(/шаг 2/i).waitFor();
    const dateButtons = page.getByRole('button', { name: /пн|вт|ср|чт|пт|сб|вс/ });
    const dateCount = await dateButtons.count();
    await dateButtons.nth(Math.max(0, dateCount - 2)).click();

    const timeButtons = page.getByRole('button', { name: /^\d{2}:\d{2}$/ });
    const timeCount = await timeButtons.count();
    const timeIdx = Math.floor(Math.random() * timeCount);
    await timeButtons.nth(timeIdx).click();
    await page.getByRole('button', { name: /далее/i }).click();

    // Шаг 3
    await page.getByText(/шаг 3/i).waitFor();
    const nameField = page.locator('label:has-text("Имя") + input, label:has-text("Имя") ~ input').first();
    await nameField.fill(TEST_NAME);
    await page.getByPlaceholder('+7 ...').fill('+79991234567');
    await page.getByRole('checkbox').first().check();
    await page.getByRole('button', { name: /далее/i }).click();

    // Шаг 4 — подтверждение с перехватом ответа API
    await page.getByText(/шаг 4/i).waitFor();

    let apiError = '';
    page.on('response', async (response) => {
      if (response.url().includes('/api/appointments') && response.request().method() === 'POST') {
        if (!response.ok()) {
          const body = await response.json().catch(() => ({}));
          apiError = `${response.status()} ${JSON.stringify(body)}`;
        }
      }
    });

    for (let attempt = 0; attempt < 3; attempt++) {
      const confirmBtn = page.getByRole('button', { name: /подтвердить запись/i });
      if (await confirmBtn.isVisible()) {
        apiError = '';
        await confirmBtn.click();
      }

      try {
        await expect(page.getByRole('button', { name: /запись создана/i }))
          .toBeVisible({ timeout: 15000 });
        break;
      } catch {
        if (attempt === 2) throw new Error(`Запись не создана после 3 попыток. API: ${apiError}`);
        await page.waitForTimeout(2000);
      }
    }
  });
});

test.describe('4. Валидация формы записи', () => {
  test('Нельзя отправить форму без обязательных полей', async ({ page }) => {
    await loginViaApi(page);
    await page.goto('/booking');

    await page.locator('select').first().selectOption({ index: 1 });
    await page.getByRole('button', { name: /далее/i }).click();

    await page.getByText(/шаг 2/i).waitFor();
    await page.getByRole('button', { name: /пн|вт|ср|чт|пт|сб|вс/ }).nth(1).click();
    await page.getByRole('button', { name: /^\d{2}:\d{2}$/ }).first().click();
    await page.getByRole('button', { name: /далее/i }).click();

    // Шаг 3 — поля пустые, жмём «Далее»
    await page.getByText(/шаг 3/i).waitFor();
    await page.getByRole('button', { name: /далее/i }).click();

    await expect(page.getByText(/укажите ваше имя/i)).toBeVisible();
    await expect(page.getByText(/укажите номер телефона/i)).toBeVisible();
    await expect(page.getByText(/необходимо согласие/i)).toBeVisible();
  });
});

test.describe('5. Защита без авторизации', () => {
  test('Неавторизованный пользователь перенаправляется с /admin на /login', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });

  test('Неавторизованный пользователь не видит ссылку «Мои записи»', async ({ page }) => {
    await page.goto('/services');
    await expect(page.getByRole('link', { name: 'Мои записи' })).not.toBeVisible();
  });
});

test.describe('6. Отмена и перенос записи', () => {
  test('Пользователь отменяет запись и видит её в «Отменённых»', async ({ page }) => {
    await loginViaApi(page);
    await page.goto('/my-appointments');

    const cancelButton = page.getByRole('button', { name: 'Отменить' }).first();
    if (!(await cancelButton.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip(true, 'Нет активных записей для отмены');
      return;
    }

    await cancelButton.click();
    await page.waitForTimeout(1500);

    await page.getByRole('button', { name: /отменённые/i }).click();
    await expect(page.getByText(/отменена/i).first()).toBeVisible();
  });

  test('Пользователь переносит запись на другую дату', async ({ page }) => {
    await loginViaApi(page);
    await page.goto('/my-appointments');

    const rescheduleButton = page.getByRole('button', { name: 'Перенести' }).first();
    if (!(await rescheduleButton.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip(true, 'Нет активных записей для переноса');
      return;
    }

    await rescheduleButton.click();
    await expect(page.getByText(/перенести запись/i)).toBeVisible();

    const dateInput = page.getByLabel(/новая дата/i).or(page.locator('input[type="date"]'));
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 3);
    await dateInput.fill(futureDate.toISOString().split('T')[0]);

    await page.getByRole('button', { name: /сохранить/i }).click();
    await page.waitForTimeout(1500);

    await expect(page.getByText(/перенести запись/i)).not.toBeVisible();
  });
});
