import { useContext, useEffect } from "react"
import { AuthContext } from "../context/AuthContext"
import { api } from "../services/api";

export default function Dashboard() {

  useEffect(() => {
    api.get('/me').then(response => {
      console.log(response);
    })
  }, [])

  const { user } = useContext(AuthContext)

  return(
    <h1>dashboard: {user?.email}</h1>
  )
}