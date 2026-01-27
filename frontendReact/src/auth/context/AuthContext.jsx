import { createContext, useState, useContext } from 'react'; // Importa las funciones necesarias de React
import * as authService from '../services/authService';// Importa las funciones de autenticación

const AuthContext = createContext(); //COntenedor que almacena el estado de autenticación

export const AuthProvider = ({ children }) => { //Su trabajo es: "Proveer" el contexto a toda la aplicación o parte de ella
  const [user, setUser] = useState(null); //Estado para almacenar la información del usuario autenticado

  const login = async (email, password) => { //Función para iniciar sesión
    const data = await authService.login(email, password);
    setUser(data.user);
    return data;
  };

  const logout = () => {
    authService.logout(); // Elimina el token del almacenamiento local
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);