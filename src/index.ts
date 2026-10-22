import { app } from './app'

app.listen(3000, ({ hostname, port }) => {
  // oxlint-disable-next-line no-console
  console.log(`Elysia is running at ${hostname}:${port}`)
})
