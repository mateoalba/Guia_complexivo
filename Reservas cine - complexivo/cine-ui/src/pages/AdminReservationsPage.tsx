import { useEffect, useState } from "react";
import {
  Container, Paper, Typography, TextField, Button, Stack,
  Table, TableHead, TableRow, TableCell, TableBody, IconButton, Alert,
  FormControl, InputLabel, Select, MenuItem, 
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";

import { type Show, listShowsApi } from "../api/shows.api";
import { type Reservation, listReservationsAdminApi, createReservationApi, updateReservationApi, deleteReservationApi } from "../api/reservations.api";

export default function AdminReservationsPage() {
  const [items, setItems] = useState<Reservation[]>([]);
  const [shows, setShows] = useState<Show[]>([]);
  const [show, setShow] = useState<number>(0);
  const [customerName, setCustomerName] = useState("");
  const [total, setTotal] = useState("");
  const [status, setStatus] = useState("");
  const [showTime, setShowTime] = useState("");
  const [error, setError] = useState("");
  const [editId, setEditId] = useState<number | null>(null);


  const load = async () => {
    try {
      setError("");
      const data = await listReservationsAdminApi();
      setItems(data.results); // DRF paginado
    } catch {
      setError("No se pudo cargar Reservas. ¿Login? ¿Token admin?");
    }
  };

  const loadShows = async () => {
    try {
      const data = await listShowsApi();
      setShows(data.results); // DRF paginado
      if (!show && data.results.length > 0) setShow(data.results[0].id);
    } catch {
      // si falla, no bloquea la pantalla
    }
  };

  useEffect(() => { load(); loadShows(); }, []);

  const save = async () => {
    try {
      setError("");
      if (!show) return setError("Seleccione una funcion");
      if (!customerName.trim() || !total.trim() || !status.trim() || !showTime.trim()) return setError("Todos los campos son requeridos");

      const payload = {
        show: Number(show),
        customer_name: customerName.trim(),
        total: Number(total),
        status: status.trim(),
        show_time: showTime.trim(),
      };

      if (editId) await updateReservationApi(editId, payload);
      else await createReservationApi(payload);

      setEditId(null);
      setCustomerName("");
      setTotal("");
      setStatus("");
      setShowTime("");
      await load();
    } catch {
      setError("No se pudo guardar reserva. ¿Token admin?");
    }
  };

  const startEdit = (v: Reservation) => {
    setEditId(v.id);
    setShow(v.show);
    setCustomerName(v.customer_name);
    setTotal(String(v.total));
    setStatus(v.status);
    setShowTime(v.show_time);
  };

  const remove = async (id: number) => {
    try {
      setError("");
      await deleteReservationApi(id);
      await load();
    } catch {
      setError("No se pudo eliminar reserva. ¿Token admin?");
    }
  };

  return (
    <Container sx={{ mt: 3 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h5" sx={{ mb: 2 }}>Admin Reservas (Privado)</Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Stack spacing={2} sx={{ mb: 2 }}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>

            <FormControl sx={{ width: 260 }}>
              <InputLabel id="show-label">Show</InputLabel>
              <Select
                labelId="show-label"
                label="Show"
                value={show}
                onChange={(e) => setShow(Number(e.target.value))}
              >
                {shows.map((m) => (
                  <MenuItem key={m.id} value={m.id}>
                    {m.title} (#{m.id})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField label="Cliente" value={customerName} onChange={(e) => setCustomerName(e.target.value)} fullWidth />
            <TextField label="Total" type="number" value={total} onChange={(e) => setTotal(e.target.value)} sx={{ width: 160 }} />
          </Stack>

          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
    <FormControl sx={{ width: 260 }}>
      <InputLabel id="status-label">Estado</InputLabel>
      <Select
        labelId="status-label"
        label="Estado"
        value={status}
        onChange={(e) => setStatus(String(e.target.value))}
      >
        <MenuItem value="RESERVED">Reserved</MenuItem>
        <MenuItem value="CONFIRMED">Confirmado</MenuItem>
        <MenuItem value="CANCELLED">Cancelado</MenuItem>
        <MenuItem value="ATTENDED">Atendido</MenuItem>
      </Select>
      </FormControl>
            <TextField label="Fecha del Show"  type="datetime-local" value={showTime} onChange={(e) => setShowTime(e.target.value)} sx={{ width: 220 }} />

            <Button variant="contained" onClick={save}>{editId ? "Actualizar" : "Crear"}</Button>
            <Button variant="outlined" onClick={() => { setEditId(null); setCustomerName(""); setTotal(""); setStatus(""); setShowTime(""); }}>Limpiar</Button>
            <Button variant="outlined" onClick={() => { load(); loadShows(); }}>Refrescar</Button>
          </Stack>
        </Stack>

        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Show</TableCell>
              <TableCell>Cliente</TableCell>
              <TableCell>Total</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell>Fecha del show</TableCell>
              <TableCell align="right">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((v) => (
              <TableRow key={v.id}>
                <TableCell>{v.id}</TableCell>
                <TableCell>{v.show_title ?? v.show}</TableCell>
                <TableCell>{v.customer_name}</TableCell>
                <TableCell>{v.total}</TableCell>
                <TableCell>{v.status}</TableCell>
                <TableCell>{v.show_time}</TableCell>
                <TableCell align="right">
                  <IconButton onClick={() => startEdit(v)}><EditIcon /></IconButton>
                  <IconButton onClick={() => remove(v.id)}><DeleteIcon /></IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Container>
  );
}