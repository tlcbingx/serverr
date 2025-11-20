# Настройка автоматического обновления статистики

Статистика теперь хранится в базе данных и обновляется автоматически каждый день в 12:00 ночи.

## Настройка Cron Job

### Вариант 1: Использование внешнего сервиса (cron-job.org, EasyCron и т.д.)

1. Зарегистрируйтесь на одном из сервисов:
   - https://cron-job.org (бесплатно)
   - https://www.easycron.com
   - https://crontab.guru (только планировщик)

2. Создайте новый cron job со следующими параметрами:
   - **URL**: `https://your-domain.com/api/stats/update?secret=YOUR_SECRET_KEY`
   - **Расписание**: `0 0 * * *` (каждый день в 00:00 UTC, что соответствует 12:00 ночи по Москве в зимнее время или 01:00 ночи в летнее)
   - **Метод**: GET или POST
   - **Заголовки**: `X-Cron-Secret: YOUR_SECRET_KEY` (если используете POST)

3. Установите переменную окружения `CRON_SECRET_KEY` в настройках вашего хостинга (Netlify/Vercel):
   ```
   CRON_SECRET_KEY=your-very-secret-key-here
   ```

### Вариант 2: Netlify Scheduled Functions (если используете Netlify)

1. Создайте файл `netlify/functions/update-stats.js`:
```javascript
exports.handler = async (event, context) => {
  const https = require('https')
  const url = new URL(process.env.URL + '/api/stats/update')
  url.searchParams.set('secret', process.env.CRON_SECRET_KEY)
  
  return new Promise((resolve) => {
    https.get(url.toString(), (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        resolve({
          statusCode: 200,
          body: JSON.stringify({ message: 'Stats updated', data })
        })
      })
    })
  })
}
```

2. Добавьте в `netlify.toml`:
```toml
[build]
  functions = "netlify/functions"

[[plugins]]
  package = "@netlify/plugin-scheduled-functions"
```

### Вариант 3: Vercel Cron Jobs (если используете Vercel)

1. Создайте файл `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/stats/update?secret=YOUR_SECRET_KEY",
    "schedule": "0 0 * * *"
  }]
}
```

2. Установите переменную окружения `CRON_SECRET_KEY` в настройках Vercel

## Проверка работы

После настройки cron job, проверьте:

1. **Ручной запуск обновления**:
   ```bash
   curl "https://your-domain.com/api/stats/update?secret=YOUR_SECRET_KEY"
   ```

2. **Проверка данных в БД**:
   - Статистика должна появиться в таблице `aggregate_stats`
   - API `/api/stats/aggregate` должен возвращать данные из БД (быстро, без расчета)

3. **Логи**:
   - Проверьте логи вашего хостинга на наличие ошибок
   - Убедитесь, что cron job выполняется успешно

## Важные замечания

- **Секретный ключ**: Обязательно установите `CRON_SECRET_KEY` в переменных окружения
- **Часовой пояс**: Cron job работает в UTC, учитывайте разницу с вашим часовым поясом
- **Резервный вариант**: Если БД недоступна, API будет рассчитывать статистику на лету (медленно, но работает)

## Структура таблицы в БД

```sql
CREATE TABLE aggregate_stats (
  id SERIAL PRIMARY KEY,
  year_pnl_percent NUMERIC(10, 2) NOT NULL,
  month_pnl_percent NUMERIC(10, 2) NOT NULL,
  active_coins INTEGER NOT NULL,
  coin_stats JSONB,
  updated_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);
```

Таблица создается автоматически при первом сохранении статистики.

