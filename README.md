# Amigo Studio

> Amigo is the friend who stays for all of it — the start, the flaky test, the blank page.
> One Cursor window. Every product. Each on its own git.

This folder is a Cursor workspace for the products you keep in git. You talk to **Amigo** here. Each product stays its own repo.

When you have more than one product, extra Cursor windows get tiring. This workspace is meant to replace that habit.

Open this folder. Talk to **Amigo**.

```text
You:   Add https://github.com/you/checkout-app and start it.

Amigo: checkout-app is running at http://localhost:4000/

You:   The login test is flaky. Fix it.
```

`checkout-app` is a stand-in. Use your own repo URL and name.

## Start

You need Node.js 22 or newer.

1. Open this folder in Cursor.
2. In the terminal, install dependencies and ask Amigo for status:

```text
npm install
npx amigo
```

You should see the studio name and any products already registered.

3. Add a product. This clones the repo into the workspace and registers it. It does not start the app:

```text
npx amigo add <git-url>
```

4. In the Cursor chat, ask Amigo to switch to that product and start it. For the example above, that would be: “Switch to checkout-app and start it.”

When the app is up, Amigo replies with a local URL. Open that URL in your browser.

## Everyday

Talk the way you would to a friend who already has the repo open. After you switch, Amigo stays on that product until you name a different one.

The work itself:

- “The login test is flaky. Fix it.”
- “Don't change anything yet. Why does checkout fail when the cart is empty?”
- “Add a resend-email button on the receipt page.”
- “Rewrite the empty-cart copy. Keep it short.”

When you need the app up or down, say so in the same voice:

- “Switch to checkout-app.”
- “Start it.”
- “Stop it.”
- “Hola Amigo” — opens the studio dashboard in the browser.

The dashboard UI lives in `dashboard/`. After a UI change: `npm run dashboard:build`. Live reload while the sidecar is up: `npm run dashboard:dev`.

If you want to check that the studio itself is healthy, run `npm test` in this folder.

## More

- [Owner flow](docs/OWNER.md) — daily map for this desk
- [CLI reference](docs/cli.md) — commands, ports, and flags

## License

This checkout is private. It is not a published package.
