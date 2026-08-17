import { useEffect, useState } from "react";
import {
  Container, Paper, Typography, TextField, Button, Stack, FormControlLabel, Switch,
  Table, TableHead, TableRow, TableCell, TableBody, IconButton, Alert
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";

import { type Show, listShowsApi, createShowApi, updateShowApi, deleteShowApi } from "../api/shows.api";

export default function AdminShowsPage() {
  const [items, setItems] = useState<Show[]>([]);
  const [title, setTitle] = useState("");
  const [genre, setGenre] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("");
  const [rating, setRating] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [editId, setEditId] = useState<number | null>(null);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      setError("");
      const data = await listShowsApi();
      setItems(data.results); // DRF paginado
    } catch {
      setError("No se pudo cargar shows. ¿Login? ¿Token admin?");
    }
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    try {
      setError("");
      if (!title.trim() || !genre.trim() || !durationMinutes.trim() || !rating.trim()) return setError("Todos los campos son requeridos");
      
      const payload = {
        title: title.trim(),
        genre: genre.trim(),
        duration_minutes: Number(durationMinutes),
        rating: rating.trim(),
        is_active: isActive,
      }

      if (editId) await updateShowApi(editId, payload);
      else await createShowApi(payload);

      setTitle("");
      setGenre("");
      setDurationMinutes("");
      setRating("");
      setIsActive(true);
      setEditId(null);
      await load();
    } catch {
      setError("No se pudo guardar Show. ¿Token admin?");
    }
  };

  const startEdit = (m: Show) => {
    setEditId(m.id);
    setTitle(m.title);
    setGenre(m.genre);
    setDurationMinutes(String(m.duration_minutes));
    setRating(m.rating);
    setIsActive(m.is_active);
  };

  const remove = async (id: number) => {
    try {
      setError("");
      await deleteShowApi(id);
      await load();
    } catch {
      setError("No se pudo eliminar Show. ¿Shows asociados? ¿Token admin?");
    }
  };

  return (
    <Container sx={{ mt: 3 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h5" sx={{ mb: 2 }}>Admin Shows (Privado)</Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 2 }}>
          <TextField label="Nombre de Show" value={title} onChange={(e) => setTitle(e.target.value)} fullWidth />
          <TextField label="Genero" value={genre} onChange={(e) => setGenre(e.target.value)} fullWidth />
          <TextField label="Duracion en minutos" type="number" value={durationMinutes} onChange={(e) => setDurationMinutes(e.target.value)} fullWidth />
          <TextField label="Rating" value={rating} onChange={(e) => setRating(e.target.value)} fullWidth />

     <FormControlLabel
        control={
          <Switch checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
        }
        label={isActive ? "Disponible" : "No Disponible"}
      />

          <Button variant="contained" onClick={save}>{editId ? "Actualizar" : "Crear"}</Button>
          <Button variant="outlined" onClick={() => { 
            setTitle("");
            setGenre("");
            setDurationMinutes("");
            setRating("");
            setIsActive(true);
            setEditId(null); 
            }}>Limpiar</Button>
          <Button variant="outlined" onClick={load}>Refrescar</Button>
        </Stack>

        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Titulo</TableCell>
              <TableCell>Genero</TableCell>
              <TableCell>Duracion</TableCell>
              <TableCell>Rating</TableCell>
              <TableCell>Esta activo</TableCell>
              <TableCell align="right">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((m) => (
              <TableRow key={m.id}>
                <TableCell>{m.id}</TableCell>
                <TableCell>{m.title}</TableCell>
                <TableCell>{m.genre}</TableCell>
                <TableCell>{m.duration_minutes}</TableCell>
                <TableCell>{m.rating}</TableCell>
                <TableCell>{m.is_active ? "Si" : "No"}</TableCell>
                <TableCell align="right">
                  <IconButton onClick={() => startEdit(m)}><EditIcon /></IconButton>
                  <IconButton onClick={() => remove(m.id)}><DeleteIcon /></IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Container>
  );
}