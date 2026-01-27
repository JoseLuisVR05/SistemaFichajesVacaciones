import { createContext, useState, useContext, useEffect } from 'react'; // Importa las funciones necesarias de React
import * as authService from '../services/authService';// Importa las funciones de autenticación

const AuthContext = createContext(); //COntenedor que almacena el estado de autenticación

export const AuthProvider = ({ children }) => { //Su trabajo es: "Proveer" el contexto a toda la aplicación o parte de ella
  const [user, setUser] = useState(null); //Estado para almacenar la información del usuario autenticado
  const [loading, setLoading] = useState(true); //Estado para manejar la carga inicial
  
  useEffect(() => {
    //Recuperar sesion al cargar la aplicación
    const currentUSer = authService.getCurrentUser();
    setUser(currentUSer);
    setLoading(false);
  }, []);
  
  const login = async (email, password) => { //Función para iniciar sesión
    const data = await authService.login(email, password);
    setUser(data.user);
  };

  const logout = () => {
    authService.logout(); // Elimina el token del almacenamiento local
    setUser(null);
  };
  // Función para verificar si el usuario tiene alguno de los roles especificados
  const hasRole = (roles) => {
    if (!user?.role) return false;
    return roles.some(r => user.role.includes(r));
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, hasRole, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);