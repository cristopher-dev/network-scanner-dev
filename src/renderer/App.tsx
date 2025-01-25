import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import Home from './components/Home';
import './App.css';

// Configurar las flags futuras
const router = createBrowserRouter([
  {
    path: '/',
    element: <Home />,
  },
]);

function App() {
  return (
    <RouterProvider
      router={router}
      future={{
        v7_startTransition: true,
      }}
    />
  );
}

export default App;
