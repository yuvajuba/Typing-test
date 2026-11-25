https://yuvajuba.github.io/Typing-test/

## Word lists

Each topic's words live in `words/<topic>.json` (a plain JSON array of strings).

- **Edit a topic:** add or remove words in its JSON file.
- **Add a topic:** create `words/<id>.json` and add `<option value="<id>">Name</option>` to the topic list in `index.html`.
- **Mixture of all** is built automatically from 10 random words of every topic.

The lists are loaded with `fetch()`, so run the page through a local server (e.g. VS Code "Live Server" or `npx serve`) rather than opening `index.html` directly from disk.
