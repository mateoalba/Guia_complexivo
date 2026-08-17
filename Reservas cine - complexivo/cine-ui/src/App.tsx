import { BrowserRouter, Routes, Route, Link, Navigate } from "react-router-dom";
import { AppBar, Toolbar, Typography, Button, Stack } from "@mui/material";

import HomePage from "./pages/HomePage";
import AboutPage from "./pages/AboutPage";
import PublicReservationsPage from "./pages/PublicReservationsPage";
import LoginPage from "./pages/LoginPage";

import AdminHomePage from "./pages/AdminHomePage";
import AdminShowsPage from "./pages/AdminShowsPage";
import AdminReservationsPage from "./pages/AdminReservationsPage";

import RequireAuth from "./components/RequireAuth";

export default function App() {
  return (
    <BrowserRouter>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Cine UI (MUI)
          </Typography>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ flexWrap: "wrap" }}>
            <Button color="inherit" component={Link} to="/">Home</Button>
            <Button color="inherit" component={Link} to="/acerca">Acerca</Button>
            <Button color="inherit" component={Link} to="/lista">Lista</Button>
            <Button color="inherit" component={Link} to="/login">Login</Button>
            <Button color="inherit" component={Link} to="/admin">Admin</Button>
          </Stack>
        </Toolbar>
      </AppBar>

      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/acerca" element={<AboutPage />} />
        <Route path="/lista" element={<PublicReservationsPage />} />
        <Route path="/login" element={<LoginPage />} />

        <Route
          path="/admin"
          element={
            <RequireAuth>
              <AdminHomePage />
            </RequireAuth>
          }
        />

        <Route
          path="/admin/shows"
          element={
            <RequireAuth>
              <AdminShowsPage />
            </RequireAuth>
          }
        />

        <Route
          path="/admin/reservations"
          element={
            <RequireAuth>
              <AdminReservationsPage />
            </RequireAuth>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}