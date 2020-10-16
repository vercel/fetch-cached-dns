const { isIP } = require('net')
const { format, parse } = require('url')
const resolve = require('@zeit/dns-cached-resolve').default

module.exports = setup

const isRedirect = v => ((v / 100) | 0) === 3

function setup(fetch) {
  if (!fetch) {
    fetch = require('node-fetch')
  }
  const { Headers } = fetch

  async function fetchCachedDns(url, opts) {
    const parsed = parse(url)
    const originalHost = parsed.host
    const ip = isIP(parsed.hostname)
    if (ip === 0) {
      if (!opts) opts = {}
      opts.headers = new Headers(opts.headers)
      if (!opts.headers.has('Host')) {
        opts.headers.set('Host', parsed.host)
      }
      opts.redirect = 'manual'
      parsed.host = parsed.hostname = await resolve(parsed.hostname)
      if (parsed.port) {
        parsed.host += `:${parsed.port}`
      }
      url = format(parsed)
    }
    const res = await fetch(url, opts)
    if (isRedirect(res.status)) {
      const redirectOpts = Object.assign({}, opts)
      redirectOpts.headers = new Headers(opts.headers)

      // Per fetch spec, for POST request with 301/302 response, or any
      // request with 303 response, use GET when following redirect
      if (
        res.status === 303 ||
        ((res.status === 301 || res.status === 302) && opts.method === 'POST')
      ) {
        redirectOpts.method = 'GET'
        redirectOpts.body = null
        redirectOpts.headers.delete('content-length')
      }

      // Set the proper `Host` request header, considering that node-fetch will
      // absolutize a relative redirect URL, so the IP address needs to be
      // replaced with the original hostname as well.
      const location = res.headers.get('Location')
      let { host: redirectHost } = parse(location)
      if (redirectHost === parsed.host) {
        redirectHost = originalHost
      }
      redirectOpts.headers.set('Host', redirectHost)

      if (opts.onRedirect) {
        opts.onRedirect(res, redirectOpts)
      }

      return fetchCachedDns(location, redirectOpts)
    }
    return res
  }

  for (const key of Object.keys(fetch)) {
    fetchCachedDns[key] = fetch[key]
  }

  fetchCachedDns.default = fetchCachedDns

  return fetchCachedDns
}
