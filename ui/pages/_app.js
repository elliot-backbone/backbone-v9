import '../styles/globals.css'
import EntitySearch from '../components/EntitySearch'

export default function App({ Component, pageProps }) {
  return (
    <>
      <EntitySearch />
      <Component {...pageProps} />
    </>
  )
}
