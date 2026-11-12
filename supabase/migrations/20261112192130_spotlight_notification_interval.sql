-- Keep Spotlight checks frequent without keeping a free Render web service
-- awake continuously. Render free services spin down after 15 minutes idle.
select cron.alter_job(3, schedule := '*/30 * * * *');
