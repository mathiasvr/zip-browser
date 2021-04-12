import { ZipReader, HttpReader, BlobWriter } from '@zip.js/zip.js/lib/zip-no-worker-inflate'

self.addEventListener('fetch', event => {
  const { request } = event
  // Skip cross-origin requests
  if (request.url.startsWith(self.registration.scope)) {
    const path = request.url.slice(self.registration.scope.length)
    const s = path.split('/')

    if (s.length > 1) {
      const zipFileName = s.shift()
      const fileName = s.join('/')

      if (zipFileName.endsWith('.zip')) {
        event.respondWith(handleRequest(request, zipFileName, fileName))
      }
    }
  }
})

async function handleRequest (request, zipFileName, fileName) {
  let reader

  try {
    reader = new ZipReader(new HttpReader(zipFileName))
    const response = await zipreadfile(reader, fileName, request)

    return response
  } catch (error) {
    // todo status codes
    return new Response(error.message, {
      headers: { 'content-type': 'text/plain' }
    })
  } finally {
    // close the ZipReader
    if (reader) reader.close()
  }
}

async function zipreadfile (reader, fileName, request) {
  // get all entries from the zip
  const entries = await reader.getEntries()

  if (!entries) {
    throw new Error('No entries in zip file')
  }

  if (!fileName) {
    // root
    return new Response(`<a href=${entries[0].filename}>${entries[0].filename}</a>`, {
      headers: { 'content-type': 'text/html' }
    })
  }

  const entry = entries.find(e => e.filename === fileName)

  if (entry) {
    if (entry.directory) {
      // TODO: don't list all entries if not directly in directory
      const listing = entries
        .filter(e => e.filename.startsWith(fileName) && e.filename !== fileName)
        .map(e => e.filename.slice(fileName.length))
        .map(f => `<a href="${f}">${f}</a>`).join('<br>')

      return new Response(listing, {
        headers: { 'content-type': 'text/html' }
      })
    }

    const blob = await entry.getData(new BlobWriter(), {
      // onprogress: (index, max) => { }
      useWebWorkers: false
    })

    return new Response(blob, {
      headers: { 'content-type': 'text/plain' }
      // headers: { 'content-type': 'application/octet-stream' }
    })
  } else if (entries.find(e => e.filename === fileName + '/')) {
    return new Response('Moved', { headers: { Location: request.url + '/' }, status: 301 })
  }

  return new Response('Not found', { status: 404 })
}
