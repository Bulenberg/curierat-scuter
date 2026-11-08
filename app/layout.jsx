import './globals.css'

export const metadata = {
  title: 'DentaMoto Express',
  description: 'Curierat Moto B2B • Laboratoare Dentare București',
}

export default function RootLayout({ children }) {
  return (
    <html lang="ro">
      <body>{children}</body>
    </html>
  )
}
