# Guía Maestra — Examen Complexivo Práctico
### Backend (Django + Postgres + Mongo) · Frontend (React + MUI) · Móvil (Expo + React Native)

> Todo este documento usa el ejemplo de **Vehículos** (`Marca`/`Vehiculo`) como vocabulario base — el mismo que trae la guía del profe. El día del examen, el negocio va a cambiar (canchas, aeropuerto, gimnasio, lo que sea) — lo que **no cambia** es el patrón. Cuando leas `Marca`, piensa "el catálogo padre"; cuando leas `Vehiculo`, piensa "la entidad con la FK".

---

## 0. Antes de escribir una sola línea

Por cada tabla/colección que te den en el enunciado, identifica:
1. ¿Es un **catálogo** (como `Marca`) o una **entidad transaccional** (como `Vehiculo`, con FK al catálogo)?
2. En Mongo, ¿la colección de "bitácora" tiene un campo que referencia al catálogo Postgres (como `fleet_logs.vehicle_id`), o es **independiente** (como `airlines`/`movie_catalog`, sin ninguna FK)?
3. ¿Qué campos son literalmente obligatorios (`NOT NULL` sin default) vs opcionales (con default, o explícitamente opcionales en el enunciado)?
4. Copia los **nombres de choices exactos** del enunciado (mayúsculas, ortografía) — nunca los escribas de memoria.

---

## 1. BACKEND — Django + PostgreSQL + MongoDB

### 1.1 PostgreSQL — arranque

**Ubuntu — verificar que los servicios estén corriendo, y entrar a psql:**
```bash
sudo systemctl status postgresql
sudo systemctl start postgresql      # si no está activo

sudo systemctl status mongod
sudo systemctl start mongod          # si no está activo

sudo -u postgres psql
```

```sql
CREATE USER vehiculos_user WITH PASSWORD 'admin123';
CREATE DATABASE vehiculos_db OWNER vehiculos_user;

\c vehiculos_db

ALTER SCHEMA public OWNER TO vehiculos_user;
GRANT ALL ON SCHEMA public TO vehiculos_user;
GRANT CREATE ON SCHEMA public TO vehiculos_user;

ALTER DEFAULT PRIVILEGES FOR USER vehiculos_user IN SCHEMA public GRANT ALL ON TABLES TO vehiculos_user;
ALTER DEFAULT PRIVILEGES FOR USER vehiculos_user IN SCHEMA public GRANT ALL ON SEQUENCES TO vehiculos_user;
ALTER DEFAULT PRIVILEGES FOR USER vehiculos_user IN SCHEMA public GRANT ALL ON FUNCTIONS TO vehiculos_user;

\q
```

> Si la rúbrica pide explícitamente "permisos mínimos, sin superusuario", eso es un **ejercicio de administración aparte** (ver sección 5) — el usuario que usa Django puede seguir siendo owner con `GRANT ALL`, no hace falta que sea el mismo.

### 1.2 Proyecto Django

**Ubuntu (comando real del examen):**
```bash
mkdir vehiculos_api
cd vehiculos_api
python3 -m venv venv
source venv/bin/activate

pip install django djangorestframework djangorestframework-simplejwt psycopg2-binary python-dotenv django-cors-headers django-filter pymongo

django-admin startproject config .
python manage.py startapp catalog
```

**Windows (para practicar en casa):**
```powershell
mkdir vehiculos_api
cd vehiculos_api
python -m venv venv
.\venv\Scripts\Activate.ps1

pip install django djangorestframework djangorestframework-simplejwt psycopg2-binary python-dotenv django-cors-headers django-filter pymongo

django-admin startproject config .
python manage.py startapp catalog
```

Para volver a activar el venv en sesiones futuras (Ubuntu): `source venv/bin/activate`. Para salir: `deactivate` (igual en ambos sistemas).

⚠️ **El punto al final de `startproject config .` es obligatorio** — sin él, la estructura queda anidada mal.

⚠️ **Verifica el nombre real de la app** con `dir`/`ls` antes de escribir cualquier import — no lo asumas de memoria (me pasó a mí mismo confundir `airport` con `aeropuerto` en una sesión).

### 1.3 `.env`

```
DEBUG=1
SECRET_KEY=dev-secret-key
DB_NAME=vehiculos_db
DB_USER=vehiculos_user
DB_PASSWORD=admin123
DB_HOST=127.0.0.1
DB_PORT=5432

MONGO_URI=mongodb://127.0.0.1:27017
MONGO_DB=vehiculos_db

CORS_ORIGIN=http://localhost:5173
```

⚠️ Tiene que estar en la **misma carpeta que `manage.py`**, nunca dentro de `config/`.

### 1.4 `config/settings.py`

```python
from pathlib import Path
import os
from datetime import timedelta
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key")
DEBUG = os.getenv("DEBUG", "0") == "1"
ALLOWED_HOSTS = ["*"]

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "django_filters",
    "corsheaders",
    "catalog",  # <- nombre real de tu app
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",   # <- SIEMPRE antes que CommonMiddleware
    "django.middleware.common.CommonMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.getenv("DB_NAME"),
        "USER": os.getenv("DB_USER"),
        "PASSWORD": os.getenv("DB_PASSWORD"),
        "HOST": os.getenv("DB_HOST", "127.0.0.1"),
        "PORT": os.getenv("DB_PORT", "5432"),
    }
}

LANGUAGE_CODE = "es-ec"
TIME_ZONE = "America/Guayaquil"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": ("rest_framework_simplejwt.authentication.JWTAuthentication",),
    "DEFAULT_PERMISSION_CLASSES": ("rest_framework.permissions.IsAuthenticated",),
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 10,
    "DEFAULT_FILTER_BACKENDS": [
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ],
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=30),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
}

# Agrega TODOS los orígenes que vayas a usar: web (Vite=5173) Y Expo web (8081)
CORS_ALLOWED_ORIGINS = [
    os.getenv("CORS_ORIGIN", "http://localhost:5173"),
    "http://127.0.0.1:5173",
    "http://localhost:8081",
    "http://127.0.0.1:8081",
]

MONGO_URI = os.getenv("MONGO_URI", "mongodb://127.0.0.1:27017")
MONGO_DB = os.getenv("MONGO_DB", "vehiculos_db")   # <- default correcto DESDE EL INICIO
```

💡 `DEFAULT_PERMISSION_CLASSES = IsAuthenticated` cierra todo por defecto — cada excepción pública se declara a mano en la vista.

### 1.5 Modelos — `catalog/models.py`

```python
from django.db import models


class Marca(models.Model):
    nombre = models.CharField(max_length=120, unique=True)

    def __str__(self):
        return self.nombre


class Vehiculo(models.Model):
    class Status(models.TextChoices):        # PascalCase para la clase
        RESERVED = "RESERVED", "Reserved"    # MAYÚSCULA exacta del enunciado, copiar-pegar
        ACTIVE = "ACTIVE", "Active"
        CANCELLED = "CANCELLED", "Cancelled"  # ¡doble L!

    marca = models.ForeignKey(Marca, on_delete=models.PROTECT, related_name="vehiculos")
    modelo = models.CharField(max_length=120)
    anio = models.IntegerField()
    placa = models.CharField(max_length=20, unique=True)
    color = models.CharField(max_length=60, blank=True, default="")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.RESERVED)  # snake_case
    creado_en = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.marca.nombre} {self.modelo} ({self.placa})"
```

**Reglas de nomenclatura de modelos:**
- Clase del modelo → **singular** (`Vehiculo`, no `Vehiculos`).
- Campo FK → **singular**, nombra qué ES el objeto relacionado (`marca`, no `marcas`).
- `related_name` → **plural** (`vehiculos`, porque desde `Marca` navegas hacia *muchos*).
- `unique=True` → solo si el campo identifica de forma individual al registro (una placa, un código). **Nunca** en un campo que agrupa/categoriza (una terminal, un estado) — ahí varios registros comparten el mismo valor legítimamente.
- `on_delete=models.PROTECT` → rechaza el borrado del padre si tiene hijos. Es casi siempre lo correcto para catálogos.
- **Nunca declares el campo `id` a mano** — `DEFAULT_AUTO_FIELD` de `settings.py` ya lo genera como `BigAutoField` (equivalente a `BIGSERIAL`).
- Un campo obligatorio del enunciado (`NOT NULL`, sin default) → **nunca** lleva `null=True`, `blank=True`, ni ningún `default` en Django.
- `TIMESTAMP` en el enunciado → `DateTimeField` (fecha + hora), no `DateField` ni `TimeField`.

**Después de CUALQUIER cambio en `models.py`:** `makemigrations` + `migrate`, siempre — el archivo Python solo no toca la base real.

### 1.6 Serializers — `catalog/serializers.py`

```python
from rest_framework import serializers
from .models import Marca, Vehiculo


class MarcaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Marca
        fields = ["id", "nombre"]


class VehiculoSerializer(serializers.ModelSerializer):
    marca_nombre = serializers.CharField(source="marca.nombre", read_only=True)

    class Meta:
        model = Vehiculo
        fields = ["id", "marca", "marca_nombre", "modelo", "anio", "placa", "color", "status", "creado_en"]
```

⚠️ **Siempre van los dos**: el ID de la FK (`marca`, escribible) Y el nombre legible (`marca_nombre`, `read_only=True`). Si solo pones el segundo, el cliente no puede mandar el ID al crear.

### 1.7 Permisos — `catalog/permissions.py`

```python
from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsAdminOrReadOnly(BasePermission):
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        return bool(request.user and request.user.is_authenticated and request.user.is_staff)
```

### 1.8 Vistas — `catalog/views.py`

```python
from rest_framework import viewsets
from rest_framework.permissions import AllowAny
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from .models import Marca, Vehiculo
from .serializers import MarcaSerializer, VehiculoSerializer
from .permissions import IsAdminOrReadOnly


class MarcaViewSet(viewsets.ModelViewSet):
    queryset = Marca.objects.all().order_by("id")
    serializer_class = MarcaSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = ["nombre"]
    ordering_fields = ["id", "nombre"]


class VehiculoViewSet(viewsets.ModelViewSet):
    queryset = Vehiculo.objects.select_related("marca").all().order_by("-id")
    serializer_class = VehiculoSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["marca", "status"]
    search_fields = ["modelo", "placa", "marca__nombre"]
    ordering_fields = ["id", "anio", "modelo", "placa", "creado_en"]

    def get_queryset(self):
        qs = super().get_queryset()
        anio_min = self.request.query_params.get("anio_min")
        anio_max = self.request.query_params.get("anio_max")
        if anio_min:
            qs = qs.filter(anio__gte=anio_min)   # int() SOLO si el campo es IntegerField real
        if anio_max:
            qs = qs.filter(anio__lte=anio_max)
        return qs

    def get_permissions(self):
        if self.action == "list":       # público SOLO en listar
            return [AllowAny()]
        return super().get_permissions()
```

#### 🔑 `filterset_fields` vs `search_fields` vs `ordering_fields`

| | Qué hace | Cuándo usarlo | Ejemplo |
|---|---|---|---|
| `filterset_fields` | Coincidencia **exacta** (`=`) | Un ID de FK, un status/choice fijo | `?status=RESERVED` → solo esos |
| `search_fields` | Texto **parcial** (`LIKE %texto%`), **solo campos de texto** | Nombre, placa, destino — nunca status ni fechas ni números | `?search=toy` → encuentra "Toyota" |
| `ordering_fields` | Solo cambia el **orden**, no filtra nada | Cualquier campo por el que tenga sentido ordenar | `?ordering=-anio` |

#### 🔑 Reglas de `_min`/`_max` en `get_queryset()`
- Solo agrégalo si existe un campo `Integer`/`Decimal`/`DateTime` donde tenga sentido de negocio un rango.
- `IntegerField` → puedes castear con `int(...)`.
- `DecimalField`/`FloatField`/`DateTimeField` → **nunca** castees, pasa el string directo al `.filter()`.

### 1.9 Auth — `catalog/auth_serializers.py` + `catalog/auth_views.py`

```python
# auth_serializers.py
from django.contrib.auth import get_user_model
from rest_framework import serializers

User = get_user_model()


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)

    class Meta:
        model = User
        fields = ["username", "email", "password"]

    def create(self, validated_data):
        return User.objects.create_user(     # NUNCA .create() a secas — no hashea el password
            username=validated_data["username"],
            email=validated_data.get("email", ""),
            password=validated_data["password"],
        )
```

```python
# auth_views.py
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from .auth_serializers import RegisterSerializer


@api_view(["POST"])
@permission_classes([AllowAny])
def register_view(request):
    serializer = RegisterSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    user = serializer.save()
    return Response({"id": user.id, "username": user.username, "email": user.email}, status=status.HTTP_201_CREATED)
```

### 1.10 URLs

```python
# catalog/urls.py
from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import MarcaViewSet, VehiculoViewSet

router = DefaultRouter()
router.register(r"marcas", MarcaViewSet, basename="marcas")
router.register(r"vehiculos", VehiculoViewSet, basename="vehiculos")

urlpatterns = []
urlpatterns += router.urls
```

```python
# config/urls.py
from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from catalog.auth_views import register_view

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/login/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/auth/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("api/auth/register/", register_view, name="register"),
    path("api/", include("catalog.urls")),
]
```

⚠️ Si el enunciado especifica un nombre de endpoint literal (ej. `GET /flight-events`), respétalo tal cual (guiones incluidos) — no es una preferencia de estilo, el frontend/móvil van a depender de ese nombre exacto.

**Levantar el servidor (Ubuntu, igual que Windows):**
```bash
python manage.py makemigrations
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver 0.0.0.0:8000
```
`0.0.0.0:8000`, no `127.0.0.1:8000` — necesario para que el emulador/celular del móvil puedan alcanzar el backend.

### 1.11 MongoDB — conexión

```python
# catalog/mongo.py
from django.conf import settings
from pymongo import MongoClient

_client = MongoClient(settings.MONGO_URI)
db = _client[settings.MONGO_DB]
```

### 1.12 MongoDB — "schemas" (serializers puros)

```python
# catalog/mongo_serializers.py
from rest_framework import serializers


class ServiceTypeSerializer(serializers.Serializer):     # Serializer, NUNCA ModelSerializer
    name = serializers.CharField(max_length=120)
    description = serializers.CharField(required=False, allow_blank=True)
    base_price = serializers.FloatField(required=False)   # FloatField, NUNCA DecimalField en Mongo
    is_active = serializers.BooleanField(default=True)
    created_at = serializers.DateTimeField(required=False)  # DateTimeField, NUNCA DateField en Mongo


class VehicleServiceSerializer(serializers.Serializer):
    class EventType:                       # opciones fijas: clase simple con CHOICES
        CREATED = "CREATED"
        CONFIRMED = "CONFIRMED"
        CHOICES = [(CREATED, "Created"), (CONFIRMED, "Confirmed")]

    vehiculo_id = serializers.IntegerField()          # FK a Postgres → IntegerField
    service_type_id = serializers.CharField()         # FK a OTRA colección Mongo → CharField (ObjectId como string)
    event_type = serializers.ChoiceField(choices=EventType.CHOICES)
    date = serializers.DateTimeField(required=False)  # el backend la asigna, nunca la manda el cliente
    kilometers = serializers.IntegerField(required=False)
    cost = serializers.FloatField(required=False)
    notes = serializers.CharField(required=False, allow_blank=True)
```

#### 🔑 Las 2 reglas de oro de Mongo (las que más se repiten como bug)
1. **Fechas**: siempre `DateTimeField` + `datetime.now()` en la vista. Nunca `DateField`/`date.today()` — BSON no tiene tipo "solo fecha", solo fecha+hora.
2. **Dinero/decimales**: siempre `FloatField`. Nunca `DecimalField` — BSON no sabe serializar `Decimal` de Python.

### 1.13 MongoDB — vistas

```python
# catalog/service_types_views.py
from datetime import datetime
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from bson import ObjectId
from bson.errors import InvalidId
from .mongo import db
from .mongo_serializers import ServiceTypeSerializer

col = db["service_types"]


def fix_id(doc):
    doc["id"] = str(doc["_id"])
    del doc["_id"]
    return doc


def oid_or_none(id_str: str):
    try:
        return ObjectId(id_str)
    except InvalidId:
        return None


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def service_types_list_create(request):
    if request.method == "GET":
        q = dict(request.query_params)
        docs = [fix_id(d) for d in col.find(q)]
        return Response(docs)

    serializer = ServiceTypeSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    data = serializer.validated_data
    data.setdefault("created_at", datetime.now())   # SIEMPRE usar la variable "data" de aquí en adelante

    res = col.insert_one(data)                       # NUNCA volver a usar serializer.validated_data aquí
    doc = col.find_one({"_id": res.inserted_id})
    return Response(fix_id(doc), status=status.HTTP_201_CREATED)


@api_view(["GET", "PUT", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def service_types_detail(request, id: str):
    _id = oid_or_none(id)
    if _id is None:
        return Response({"detail": "id inválido"}, status=status.HTTP_400_BAD_REQUEST)

    if request.method == "GET":
        doc = col.find_one({"_id": _id})
        if not doc:
            return Response({"detail": "No encontrado"}, status=status.HTTP_404_NOT_FOUND)
        return Response(fix_id(doc))

    if request.method in ["PUT", "PATCH"]:
        serializer = ServiceTypeSerializer(data=request.data, partial=(request.method == "PATCH"))
        serializer.is_valid(raise_exception=True)
        col.update_one({"_id": _id}, {"$set": serializer.validated_data})   # $set: SOLO actualiza esos campos
        doc = col.find_one({"_id": _id})
        if not doc:
            return Response({"detail": "No encontrado"}, status=status.HTTP_404_NOT_FOUND)
        return Response(fix_id(doc))

    res = col.delete_one({"_id": _id})
    if res.deleted_count == 0:
        return Response({"detail": "No encontrado"}, status=status.HTTP_404_NOT_FOUND)
    return Response(status=status.HTTP_204_NO_CONTENT)
```

### 1.14 Qué va y qué NO va en el body de Postman

| Regla | Ejemplo |
|---|---|
| Sin `required=False` en el serializer → **obligatorio** | `name`, `vehiculo_id` |
| Con `required=False` → **opcional**, puede omitirse | `notes`, `description` |
| Campo con `default=...` en el **modelo** Django → opcional aunque no diga `required=False` (DRF lo infiere) | `status` con `default=Status.RESERVED` |
| Campo que el **backend asigna solo** (timestamp del sistema) → **nunca se manda**, aunque sea `required=False` | `created_at`, `date`, `fecha` |
| `BooleanField` → `true`/`false` **sin comillas** en el JSON | `"is_available": true` — nunca `"SI"` ni `"true"` |
| `DateTimeField` → string ISO con comillas | `"departure_time": "2026-08-20T14:30:00"` |

---

## 2. FRONTEND — React + TypeScript + MUI

### 2.1 Setup

**Ubuntu y Windows — los mismos comandos, `npm` no cambia entre sistemas:**
```bash
npm create vite@latest vehiculos-ui -- --template react-ts
cd vehiculos-ui
npm install
npm i axios
npm i @mui/material @emotion/react @emotion/styled
npm i @mui/icons-material
npm i react-router-dom
```

Arrancar el servidor de desarrollo (igual en ambos sistemas):
```bash
npm run dev
```

`.env` junto a `package.json`:
```
VITE_API_BASE_URL=http://127.0.0.1:8000
```

Estructura:
```
src/
  api/       (http.ts, auth.api.ts, marcas.api.ts, vehiculos.api.ts)
  components/ (RequireAuth.tsx)
  pages/     (HomePage, AboutPage, PublicVehiclesPage, LoginPage, AdminHomePage, AdminMarcasPage, AdminVehiculosPage)
  App.tsx
```

### 2.2 `src/api/http.ts`

```typescript
import axios from "axios";

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

export const http = axios.create({ baseURL: API_BASE_URL });

http.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

### 2.3 Patrón de API por entidad — la regla de `Omit`/`Partial`

```typescript
// src/api/vehiculos.api.ts
import { http } from "./http";

export type Paginated<T> = { count: number; next: string | null; previous: string | null; results: T[] };

export type Vehiculo = {
  id: number;
  marca: number;
  marca_nombre?: string;   // ? = campo calculado por el backend, nunca se envía
  modelo: string;
  anio: number;
  placa: string;
  color?: string;
  creado_en?: string;
};

export async function listVehiculosApi() {
  const { data } = await http.get<Paginated<Vehiculo>>("/api/vehiculos/");
  return data;
}

// Modelo con 1 solo campo editable → función simple recibiendo el valor suelto
export async function createMarcaApi(nombre: string) { /* ... */ }

// Modelo con 2+ campos editables → objeto tipado
export async function createVehiculoApi(payload: Omit<Vehiculo, "id" | "marca_nombre" | "creado_en">) {
  const { data } = await http.post<Vehiculo>("/api/vehiculos/", payload);
  return data;
}

export async function updateVehiculoApi(id: number, payload: Partial<Vehiculo>) {
  const { data } = await http.put<Vehiculo>(`/api/vehiculos/${id}/`, payload);
  return data;
}

export async function deleteVehiculoApi(id: number) {
  await http.delete(`/api/vehiculos/${id}/`);
}
```

`Omit<Tipo, "id" | "campo_calculado" | "auto_now">` — excluye siempre: el ID (lo genera la BD), campos de solo lectura calculados por el serializer, y timestamps automáticos.

### 2.4 `RequireAuth.tsx` (genérico, no cambia nunca)

```typescriptreact
import { Navigate } from "react-router-dom";
import type { JSX } from "react";

export default function RequireAuth({ children }: { children: JSX.Element }) {
  const token = localStorage.getItem("accessToken");
  if (!token) return <Navigate to="/login" replace />;
  return children;
}
```

### 2.5 Patrón de pantalla Admin CRUD (`AdminVehiculosPage.tsx`)

Checklist por cada campo del formulario — hazlo **por cada campo, en los 4 lugares**:
1. `useState` propio (camelCase siempre — nunca mezclar con snake_case).
2. Incluido en la **validación** de `save()`.
3. Incluido en el **reseteo** del botón "Limpiar".
4. Incluido en **`startEdit()`** para llenar el formulario al editar.

```typescriptreact
const [marca, setMarca] = useState<number>(0);       // FK: selección actual
const [marcas, setMarcas] = useState<Marca[]>([]);    // FK: catálogo completo para el <Select>
const [modelo, setModelo] = useState("");
const [anio, setAnio] = useState(2020);
const [placa, setPlaca] = useState("");
const [status, setStatus] = useState("RESERVED");
const [isAvailable, setIsAvailable] = useState(true); // booleano

const loadMarcas = async () => {
  const data = await listMarcasApi();
  setMarcas(data.results);
  if (!marca && data.results.length > 0) setMarca(data.results[0].id);  // preselecciona la primera
};

const save = async () => {
  if (!modelo.trim() || !placa.trim()) return setError("Todos los campos son requeridos");
  const payload = { marca: Number(marca), modelo: modelo.trim(), anio: Number(anio), placa: placa.trim(), status, is_available: isAvailable };
  if (editId) await updateVehiculoApi(editId, payload);
  else await createVehiculoApi(payload);   // sin "as any" — si el payload está bien tipado, no hace falta forzar
  // resetear TODOS los campos
};
```

**`<Select>` con datos de otra tabla (dinámico):**
```typescriptreact
<Select value={marca} onChange={(e) => setMarca(Number(e.target.value))}>
  {marcas.map((m) => <MenuItem key={m.id} value={m.id}>{m.nombre}</MenuItem>)}
</Select>
```

**`<Select>` de opciones fijas (estático, valores copiados del `TextChoices` de Django):**
```typescriptreact
<Select value={status} onChange={(e) => setStatus(e.target.value)}>
  <MenuItem value="RESERVED">Reserved</MenuItem>
  <MenuItem value="ACTIVE">Active</MenuItem>
  <MenuItem value="CANCELLED">Cancelled</MenuItem>
</Select>
```

**Booleano en formulario y en tabla:**
```typescriptreact
<FormControlLabel control={<Switch checked={isAvailable} onChange={(e) => setIsAvailable(e.target.checked)} />} label={isAvailable ? "Disponible" : "No disponible"} />
...
<TableCell>{v.is_available ? "Sí" : "No"}</TableCell>
```

**Fecha+hora en formulario:**
```typescriptreact
<TextField type="datetime-local" value={fecha} onChange={(e) => setFecha(e.target.value)} InputLabelProps={{ shrink: true }} />
```
(el formato que se manda al backend es `"2026-08-20T14:30:00"`)

### 2.6 `App.tsx` — checklist final

Verifica que **coincidan exactamente**, carácter por carácter, en 3 lugares distintos:
- El `path` de cada `<Route>` en `App.tsx`.
- El `to=` de cada botón/link que navega ahí (ej. en `AdminHomePage`).
- El nombre de archivo/import del componente.

---

## 3. MÓVIL — Expo + React Native + TypeScript

### 3.1 Setup

**Ubuntu — instalar Node 22 si no está (con NodeSource), y crear el proyecto:**
```bash
sudo apt update
sudo apt -y install curl ca-certificates
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt -y install nodejs
node -v
npm -v

npx create-expo-app@latest vehiculos-rn --template
cd vehiculos-rn
npm install
npm i axios
npx expo install react-native-screens react-native-safe-area-context
npm i @react-navigation/native @react-navigation/native-stack
npx expo install @react-native-picker/picker
```

Arrancar Expo (igual en ambos sistemas):
```bash
npm run start
# o, si algo no se refleja tras varios cambios:
npx expo start -c
```

### 3.2 ⚠️ Checklist OBLIGATORIO si el proyecto se generó con Expo Router

Muchas versiones recientes de `create-expo-app` generan por defecto un proyecto con **Expo Router** (carpeta `app/`, navegación por archivos) — incompatible con el patrón manual de esta guía. Señal: ves la pantalla "Welcome to Expo" en vez de tu Login, o mencione `src/app/index.tsx`.

1. Borrar `src/app/`, `src/hooks/`, `src/constants/` (dejar `src/components/` vacía, para tus propios componentes).
2. En `package.json`: `"main": "expo-router/entry"` → `"main": "index.js"`.
3. Crear `index.js` en la raíz:
   ```javascript
   import { registerRootComponent } from 'expo';
   import App from './App';
   registerRootComponent(App);
   ```
4. En `app.json`: quitar `"expo-router"` de `"plugins"`, borrar el bloque `"experiments"`.
5. Si `app.json` tiene `"web": { "output": "static" }` → cambiar a `"output": "single"`.
6. **Desinstalar de verdad**: `npm uninstall expo-router`.
7. Si sigue fallando con error de compatibilidad con `react-navigation`: limpieza completa —

   **Ubuntu:**
   ```bash
   rm -rf node_modules
   rm package-lock.json
   npm install
   npx expo start -c
   ```

   **Windows (PowerShell):**
   ```powershell
   Remove-Item -Recurse -Force node_modules
   Remove-Item package-lock.json
   npm install
   npx expo start -c
   ```

#### 📄 Los 3 archivos ya limpios, listos para copiar-pegar

**`package.json`** — solo cambia la línea `"main"`, el resto queda igual a lo que genera Expo (no borres ninguna dependencia salvo `expo-router`, que desaparece sola con el `npm uninstall`):
```json
{
  "name": "mi-proyecto-rn",
  "main": "index.js",
  "version": "1.0.0",
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web"
  },
  "dependencies": {
    "expo": "~57.0.13",
    "expo-splash-screen": "~57.0.6",
    "expo-status-bar": "~57.0.1",
    "react": "19.2.3",
    "react-native": "0.86.2",
    "@react-navigation/native": "^7.3.16",
    "@react-navigation/native-stack": "^7.18.8",
    "react-native-screens": "~4.26.0",
    "react-native-safe-area-context": "~5.7.0",
    "@react-native-picker/picker": "2.11.4",
    "axios": "^1.19.0"
  },
  "devDependencies": {
    "@types/react": "~19.2.2",
    "typescript": "~6.0.3"
  },
  "private": true
}
```
⚠️ Este es un ejemplo reducido — tu `package.json` real va a tener más dependencias (`expo-constants`, `expo-font`, etc.) que trae Expo por defecto. **No las borres**, solo asegúrate de que `expo-router` no esté en la lista y que `"main"` diga `"index.js"`.

**`index.js`** (nuevo, en la raíz del proyecto, junto a `package.json`):
```javascript
import { registerRootComponent } from 'expo';
import App from './App';

registerRootComponent(App);
```

**`app.json`** — quita `"expo-router"` de plugins, quita `"experiments"` completo, cambia `web.output`:
```json
{
  "expo": {
    "name": "mi-proyecto-rn",
    "slug": "mi-proyecto-rn",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/images/icon.png",
    "scheme": "miproyectorn",
    "userInterfaceStyle": "automatic",
    "ios": {
      "icon": "./assets/expo.icon"
    },
    "android": {
      "adaptiveIcon": {
        "backgroundColor": "#E6F4FE",
        "foregroundImage": "./assets/images/android-icon-foreground.png",
        "backgroundImage": "./assets/images/android-icon-background.png",
        "monochromeImage": "./assets/images/android-icon-monochrome.png"
      },
      "predictiveBackGestureEnabled": false
    },
    "web": {
      "output": "single",
      "favicon": "./assets/images/favicon.png"
    },
    "plugins": [
      [
        "expo-splash-screen",
        {
          "backgroundColor": "#208AEF",
          "image": "./assets/images/splash-icon.png",
          "imageWidth": 76
        }
      ]
    ]
  }
}
```

**Orden recomendado para aplicar los 3 cambios sin liarte:**
1. Borra `src/app/`, `src/hooks/`, `src/constants/`.
2. Edita `app.json` (plugins + experiments + web.output) — cópialo tal cual de arriba, solo ajustando `name`/`slug`/`scheme` a tu proyecto.
3. Edita `package.json`, cambia solo `"main"`.
4. Crea `index.js` en la raíz.
5. `npm uninstall expo-router`.
6. `npx expo start -c` — si falla igual, aplica la limpieza completa de `node_modules` del punto 7.

### 3.3 `src/config.ts` — la URL cambia según dónde pruebes

```typescript
export const API_BASE_URL = "http://10.0.2.2:8000";  // valor por defecto (emulador Android)
```

| Dónde pruebas | URL correcta |
|---|---|
| Emulador Android | `http://10.0.2.2:8000` |
| Navegador (Expo web, `npx expo start` + tecla `w`) | `http://127.0.0.1:8000` |
| Celular físico (misma WiFi) | `http://<IP_de_tu_PC>:8000` (obtenla con `ipconfig`) |

⚠️ Si pruebas en navegador y da error de **CORS** (`blocked by CORS policy`, mencionando el puerto `8081`) → agrega `http://localhost:8081` y `http://127.0.0.1:8081` a `CORS_ALLOWED_ORIGINS` del backend, y **reinicia** `runserver` (los cambios de `settings.py` no recargan solos).

### 3.4 `src/api/http.ts` — diferencia clave con la web

```typescript
import axios from "axios";
import { API_BASE_URL } from "../config";

type GlobalAuthStore = { accessToken?: string };

export const http = axios.create({ baseURL: API_BASE_URL, timeout: 15000 });

http.interceptors.request.use((config) => {
  const store = globalThis as unknown as GlobalAuthStore;
  const token = store.accessToken;    // globalThis, NO localStorage (eso es solo de navegador)
  config.headers = config.headers ?? {};
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
```

### 3.5 El diagnóstico ANTES de armar cualquier pantalla con Picker (el paso que más se salta)

Por cada campo del serializer Mongo, clasifícalo:

| Tipo de campo | Qué necesita en la pantalla |
|---|---|
| `IntegerField()` referenciando una tabla Postgres | **Picker dinámico** — `list<Entidad>Api()` + `.map()` |
| `CharField()` referenciando **otra colección Mongo real** | **Picker dinámico** — API a esa colección + `.map()` |
| `ChoiceField(choices=...)` — opciones fijas de Django | **Picker estático** — array `as const` escrito a mano, sin ninguna API |
| `CharField(required=False)` texto libre | `TextInput` opcional |

⚠️ **No asumas que siempre hay 2 pickers "de API"** solo porque el ejemplo de referencia los tenía — vuelve a leer tu propio `mongo_serializers.py` cada vez.

### 3.6 Patrón de pantalla con selects — `VehicleServicesScreen.tsx`

```typescriptreact
import { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, FlatList, StyleSheet } from "react-native";
import { Picker } from "@react-native-picker/picker";

import { listVehiculosApi } from "../api/vehiculos.api";
import { listServiceTypesApi } from "../api/serviceTypes.api";
import { listVehicleServicesApi, createVehicleServiceApi, deleteVehicleServiceApi } from "../api/vehicleServices.api";

import type { Vehiculo } from "../types/vehiculo";
import type { ServiceType } from "../types/serviceType";
import type { VehicleService } from "../types/vehicleService";
import { toArray } from "../types/drf";

function serviceTypeLabel(st: ServiceType): string {
  return st.name;
}

export default function VehicleServicesScreen() {
  const [services, setServices] = useState<VehicleService[]>([]);
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);

  const [selectedVehiculoId, setSelectedVehiculoId] = useState<number | null>(null);
  const [selectedServiceTypeId, setSelectedServiceTypeId] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const loadAll = async (): Promise<void> => {
    try {
      setErrorMessage("");
      const [servicesData, vehiculosData, serviceTypesData] = await Promise.all([
        listVehicleServicesApi(), listVehiculosApi(), listServiceTypesApi(),
      ]);
      const servicesList = toArray(servicesData);
      const vehiculosList = toArray(vehiculosData);
      const serviceTypesList = toArray(serviceTypesData);

      setServices(servicesList);
      setVehiculos(vehiculosList);
      setServiceTypes(serviceTypesList);

      if (selectedVehiculoId === null && vehiculosList.length) setSelectedVehiculoId(vehiculosList[0].id);
      if (!selectedServiceTypeId && serviceTypesList.length) setSelectedServiceTypeId(serviceTypesList[0].id);
    } catch {
      setErrorMessage("No se pudo cargar info. ¿Token? ¿baseURL? ¿backend encendido?");
    }
  };

  useEffect(() => { loadAll(); }, []);

  const createService = async (): Promise<void> => {
    try {
      setErrorMessage("");
      if (selectedVehiculoId === null) return setErrorMessage("Seleccione un vehículo");
      if (!selectedServiceTypeId) return setErrorMessage("Seleccione un tipo de servicio");

      // NO enviar fecha, backend la toma actual
      const created = await createVehicleServiceApi({
        vehiculo_id: selectedVehiculoId,
        service_type_id: selectedServiceTypeId,
        notes: notes.trim() || undefined,
      });

      setServices((prev) => [created, ...prev]);
      setNotes("");
    } catch {
      setErrorMessage("No se pudo crear vehicle service");
    }
  };

  const removeService = async (id: string): Promise<void> => {
    try {
      await deleteVehicleServiceApi(id);
      setServices((prev) => prev.filter((s) => s.id !== id));
    } catch {
      setErrorMessage("No se pudo eliminar vehicle service");
    }
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={services}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View>
            <Text style={styles.title}>Vehicle Services</Text>
            {!!errorMessage && <Text style={styles.error}>{errorMessage}</Text>}

            {/* Picker DINÁMICO — viene de una API real */}
            <Text style={styles.label}>Vehículo</Text>
            <Picker selectedValue={selectedVehiculoId ?? ""} onValueChange={(v) => setSelectedVehiculoId(Number(v))}>
              {vehiculos.map((v) => <Picker.Item key={v.id} label={v.placa} value={v.id} />)}
            </Picker>

            {/* Picker DINÁMICO — otra colección Mongo */}
            <Text style={styles.label}>Tipo de servicio</Text>
            <Picker selectedValue={selectedServiceTypeId} onValueChange={(v) => setSelectedServiceTypeId(String(v))}>
              {serviceTypes.map((st) => <Picker.Item key={st.id} label={serviceTypeLabel(st)} value={st.id} />)}
            </Picker>

            <TextInput placeholder="Notas" value={notes} onChangeText={setNotes} style={styles.input} />
            <Pressable onPress={createService} style={styles.btn}><Text style={styles.btnText}>Crear</Text></Pressable>
            <Pressable onPress={loadAll} style={styles.btn}><Text style={styles.btnText}>Refrescar</Text></Pressable>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text>Vehículo ID: {item.vehiculo_id}</Text>
            <Pressable onPress={() => removeService(item.id)}><Text style={styles.del}>Eliminar</Text></Pressable>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0d1117", padding: 16 },
  title: { color: "#58a6ff", fontSize: 22, fontWeight: "800", marginBottom: 10 },
  error: { color: "#ff7b72", marginBottom: 10 },
  label: { color: "#8b949e", marginBottom: 6 },
  input: { backgroundColor: "#161b22", color: "#c9d1d9", padding: 12, borderRadius: 8, marginBottom: 10, borderWidth: 1, borderColor: "#30363d" },
  btn: { backgroundColor: "#21262d", borderColor: "#58a6ff", borderWidth: 1, padding: 12, borderRadius: 8, marginBottom: 12 },
  btnText: { color: "#58a6ff", textAlign: "center", fontWeight: "700" },
  row: { backgroundColor: "#161b22", padding: 12, borderRadius: 8, marginBottom: 10, flexDirection: "row", justifyContent: "space-between" },
  del: { color: "#ff7b72", fontWeight: "700" },
});
```

**Si en tu caso uno de los dos campos es un `ChoiceField` fijo en vez de otra colección**, ese Picker cambia a estático:
```typescriptreact
const EVENT_TYPES = ["CREATED", "CONFIRMED", "CANCELLED"] as const;   // SCREAMING_SNAKE_CASE, valores copiados EXACTOS del backend
const [selectedEventType, setSelectedEventType] = useState<string>(EVENT_TYPES[0]);   // se inicializa directo, sin esperar ninguna carga

<Picker selectedValue={selectedEventType} onValueChange={(v) => setSelectedEventType(String(v))}>
  {EVENT_TYPES.map((et) => <Picker.Item key={et} label={et} value={et} />)}
</Picker>
```

**Si en tu caso uno de los dos campos es un `ChoiceField` fijo en vez de otra colección**, ese Picker cambia a estático:
```typescriptreact
const EVENT_TYPES = ["CREATED", "CONFIRMED", "CANCELLED"] as const;   // SCREAMING_SNAKE_CASE, valores copiados EXACTOS del backend
const [selectedEventType, setSelectedEventType] = useState<string>(EVENT_TYPES[0]);   // se inicializa directo, sin esperar ninguna carga

<Picker selectedValue={selectedEventType} onValueChange={(v) => setSelectedEventType(String(v))}>
  {EVENT_TYPES.map((et) => <Picker.Item key={et} label={et} value={et} />)}
</Picker>
```

### 3.6.1 ⚠️ La variante que más confunde: 1 Picker dinámico + Pickers FIJOS (no 2 dinámicos)

El ejemplo de arriba (`VehicleServicesScreen`) es el caso especial donde **los dos** campos apuntan a algo real (Postgres y otra colección Mongo). Pero muchos negocios en realidad tienen una estructura distinta: **solo un campo** es una referencia real, y el resto son `ChoiceField` que tú mismo definiste en Django. Ejemplo típico — una colección `vehicle_events` (bitácora de eventos de un vehículo):

```python
# mongo_serializers.py — el serializer real que hay que leer ANTES de escribir la pantalla
class VehicleEventSerializer(serializers.Serializer):
    class EventType:                  # ← tiene CHOICES → es FIJO, sin API
        CREATED = "CREATED"
        CONFIRMED = "CONFIRMED"
        CANCELLED = "CANCELLED"
        CHOICES = [(CREATED, "Created"), (CONFIRMED, "Confirmed"), (CANCELLED, "Cancelled")]

    class Source:                     # ← tiene CHOICES → es FIJO, sin API
        WEB = "WEB"
        MOBILE = "MOBILE"
        SYSTEM = "SYSTEM"
        CHOICES = [(WEB, "Web"), (MOBILE, "Mobile"), (SYSTEM, "System")]

    vehiculo_id = serializers.IntegerField()          # ← SIN choices → referencia real a Postgres
    event_type = serializers.ChoiceField(choices=EventType.CHOICES)
    source = serializers.ChoiceField(choices=Source.CHOICES)
    note = serializers.CharField(required=False, allow_blank=True)
    created_at = serializers.DateTimeField(required=False)
```

**Diagnóstico (hazlo SIEMPRE antes de escribir el primer Picker):** cuenta cuántos campos del serializer tienen `ChoiceField(choices=...)` (van fijos) vs cuántos son `IntegerField()`/`CharField()` simples apuntando a una tabla/colección real (van dinámicos, con `list...Api()`). Aquí: **1 dinámico** (`vehiculo_id`), **2 fijos** (`event_type`, `source`).

```typescriptreact
// screens/VehicleEventsScreen.tsx
import { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, FlatList, StyleSheet } from "react-native";
import { Picker } from "@react-native-picker/picker";

import { listVehiculosApi } from "../api/vehiculos.api";
import { listVehicleEventsApi, createVehicleEventApi, deleteVehicleEventApi } from "../api/vehicleEvents.api";

import type { Vehiculo } from "../types/vehiculo";
import type { VehicleEvent } from "../types/vehicleEvent";
import { toArray } from "../types/drf";

// Constantes FIJAS — copiadas EXACTAS del EventType/Source de Django. Nunca vienen de una API.
const EVENT_TYPES = ["CREATED", "CONFIRMED", "CANCELLED"] as const;
const SOURCES = ["WEB", "MOBILE", "SYSTEM"] as const;

function vehiculoLabel(v: Vehiculo): string {
  return v.placa;   // el campo que mejor identifica al vehículo en una lista
}

export default function VehicleEventsScreen() {
  const [items, setItems] = useState<VehicleEvent[]>([]);
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);   // solo ESTE array viene de una API

  const [selectedVehiculoId, setSelectedVehiculoId] = useState<number | null>(null);
  const [selectedEventType, setSelectedEventType] = useState<string>(EVENT_TYPES[0]);  // se inicializa directo
  const [selectedSource, setSelectedSource] = useState<string>(SOURCES[0]);            // se inicializa directo

  const [notes, setNotes] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const loadAll = async (): Promise<void> => {
    try {
      setErrorMessage("");
      // Promise.all con SOLO 2 llamadas (no 3) — porque solo hay UNA fuente externa además del listado
      const [eventsData, vehiculosData] = await Promise.all([
        listVehicleEventsApi(),
        listVehiculosApi(),
      ]);
      const eventsList = toArray(eventsData);
      const vehiculosList = toArray(vehiculosData);

      setItems(eventsList);
      setVehiculos(vehiculosList);

      if (selectedVehiculoId === null && vehiculosList.length) {
        setSelectedVehiculoId(vehiculosList[0].id);
      }
    } catch {
      setErrorMessage("No se pudo cargar info. ¿Token? ¿backend encendido?");
    }
  };

  useEffect(() => { loadAll(); }, []);

  const createItem = async (): Promise<void> => {
    try {
      setErrorMessage("");
      if (selectedVehiculoId === null) return setErrorMessage("Seleccione un vehículo");

      // NO enviar created_at, el backend la asigna con datetime.now()
      const created = await createVehicleEventApi({
        vehiculo_id: selectedVehiculoId,
        event_type: selectedEventType,
        source: selectedSource,
        note: notes.trim() || undefined,
      });

      setItems((prev) => [created, ...prev]);
      setNotes("");
    } catch {
      setErrorMessage("No se pudo crear el evento");
    }
  };

  const removeItem = async (id: string): Promise<void> => {
    try {
      await deleteVehicleEventApi(id);
      setItems((prev) => prev.filter((it) => it.id !== id));
    } catch {
      setErrorMessage("No se pudo eliminar el evento");
    }
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View>
            <Text style={styles.title}>Eventos de Vehículo</Text>
            {!!errorMessage && <Text style={styles.error}>{errorMessage}</Text>}

            {/* Picker 1: DINÁMICO — el único que viene de una API real */}
            <Text style={styles.label}>Vehículo</Text>
            <Picker selectedValue={selectedVehiculoId ?? ""} onValueChange={(v) => setSelectedVehiculoId(Number(v))}>
              {vehiculos.map((v) => <Picker.Item key={v.id} label={vehiculoLabel(v)} value={v.id} />)}
            </Picker>

            {/* Picker 2: FIJO — .map() sobre la constante, SIN ninguna llamada HTTP */}
            <Text style={styles.label}>Tipo de evento</Text>
            <Picker selectedValue={selectedEventType} onValueChange={(v) => setSelectedEventType(String(v))}>
              {EVENT_TYPES.map((et) => <Picker.Item key={et} label={et} value={et} />)}
            </Picker>

            {/* Picker 3: FIJO — mismo patrón */}
            <Text style={styles.label}>Fuente</Text>
            <Picker selectedValue={selectedSource} onValueChange={(v) => setSelectedSource(String(v))}>
              {SOURCES.map((s) => <Picker.Item key={s} label={s} value={s} />)}
            </Picker>

            <TextInput placeholder="Notas" value={notes} onChangeText={setNotes} style={styles.input} />
            <Pressable onPress={createItem} style={styles.btn}><Text style={styles.btnText}>Crear</Text></Pressable>
            <Pressable onPress={loadAll} style={styles.btn}><Text style={styles.btnText}>Refrescar</Text></Pressable>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text>Vehículo ID: {item.vehiculo_id} — {item.event_type}</Text>
            <Pressable onPress={() => removeItem(item.id)}><Text style={styles.del}>Eliminar</Text></Pressable>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0d1117", padding: 16 },
  title: { color: "#58a6ff", fontSize: 22, fontWeight: "800", marginBottom: 10 },
  error: { color: "#ff7b72", marginBottom: 10 },
  label: { color: "#8b949e", marginBottom: 6 },
  input: { backgroundColor: "#161b22", color: "#c9d1d9", padding: 12, borderRadius: 8, marginBottom: 10, borderWidth: 1, borderColor: "#30363d" },
  btn: { backgroundColor: "#21262d", borderColor: "#58a6ff", borderWidth: 1, padding: 12, borderRadius: 8, marginBottom: 12 },
  btnText: { color: "#58a6ff", textAlign: "center", fontWeight: "700" },
  row: { backgroundColor: "#161b22", padding: 12, borderRadius: 8, marginBottom: 10, flexDirection: "row", justifyContent: "space-between" },
  del: { color: "#ff7b72", fontWeight: "700" },
});
```

#### 🔑 Tabla comparativa — cuál de los dos patrones usar

| | 3.6 `VehicleServicesScreen` (2 dinámicos) | 3.6.1 `VehicleEventsScreen` (1 dinámico + 2 fijos) |
|---|---|---|
| ¿Cuántas llamadas en `Promise.all`? | 3 (`listVehicleServicesApi`, `listVehiculosApi`, `listServiceTypesApi`) | 2 (`listVehicleEventsApi`, `listVehiculosApi`) |
| Segundo campo del serializer | `CharField()` apuntando a OTRA colección Mongo real | `ChoiceField(choices=...)` |
| ¿Existe una función `list<Segundo>Api()`? | Sí, para el catálogo Mongo aparte | No — no hace falta, son valores fijos |
| Se inicializa con | `useState<string>("")`, se llena tras la carga | `useState<string>(CONSTANTE[0])`, ya tiene valor desde el inicio |
| Origen de las opciones del Picker | `.map()` sobre un `useState` que llena `loadAll()` | `.map()` sobre un array `as const` escrito arriba del archivo |

**La pregunta que resuelve la confusión, siempre:** abre tu propio `mongo_serializers.py` de la colección que vas a construir, y por cada campo (menos `note`/fechas) pregúntate *"¿esto tiene `ChoiceField(choices=...)`, o es un `IntegerField`/`CharField` simple apuntando a algo real?"* — el conteo de cada tipo te dice exactamente cuántos Pickers de cada clase necesitas. No asumas que el número de Pickers dinámicos es siempre 2 solo porque el primer ejemplo que viste tenía esa forma.

### 3.7 `App.tsx` móvil

```typescriptreact
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import LoginScreen from "./src/screens/LoginScreen";
import HomeScreen from "./src/screens/HomeScreen";
import ServiceTypesScreen from "./src/screens/ServiceTypesScreen";
import VehicleServicesScreen from "./src/screens/VehicleServicesScreen";

import type { RootStackParamList } from "./src/types/navigation";

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login">
        <Stack.Screen name="Login" component={LoginScreen} options={{ title: "Login" }} />
        <Stack.Screen name="Home" component={HomeScreen} options={{ title: "Menú" }} />
        <Stack.Screen name="ServiceTypes" component={ServiceTypesScreen} options={{ title: "Service Types" }} />
        <Stack.Screen name="VehicleServices" component={VehicleServicesScreen} options={{ title: "Vehicle Services" }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

⚠️ El `name="..."` de cada `<Stack.Screen>` tiene que coincidir EXACTO con `RootStackParamList` y con cada `navigation.navigate("...")`.

---

## 4. TABLA DE EQUIVALENCIAS DE COMANDOS (CMD / PowerShell / Ubuntu)

| Acción | CMD | PowerShell | Ubuntu (bash) |
|---|---|---|---|
| Borrar carpeta con contenido | `rmdir /s /q carpeta` | `Remove-Item -Recurse -Force carpeta` | `rm -rf carpeta` |
| Borrar archivo | `del archivo` | `Remove-Item archivo` | `rm archivo` |
| Activar venv | — | `.\venv\Scripts\Activate.ps1` | `source venv/bin/activate` |
| Desactivar venv | — | `deactivate` | `deactivate` |
| Ver IP local | `ipconfig` | `ipconfig` | `ip addr` / `hostname -I` |

---

## 5. ERRORES MÁS FRECUENTES — checklist antes de dar por terminado un archivo

- [ ] ¿El nombre de la app/carpeta en los imports coincide EXACTO con la carpeta real en disco?
- [ ] ¿Los `TextChoices`/`ChoiceField` están en MAYÚSCULA y con la ortografía exacta del enunciado?
- [ ] ¿`related_name` y el nombre del campo FK están en singular/plural correctos?
- [ ] ¿El campo `id` NO fue declarado a mano?
- [ ] ¿En Mongo, las fechas son `DateTimeField`+`datetime.now()` y el dinero es `FloatField`?
- [ ] ¿El `insert_one`/`update_one` usa la variable `data` (no `serializer.validated_data`) después de un `setdefault`?
- [ ] ¿`filterset_fields`/`search_fields`/`ordering_fields` no mezclan campos de tipo incorrecto (status en search, fecha en search)?
- [ ] ¿El `_min`/`_max` evita `int()` sobre campos `Decimal`/`Float`/`DateTime`?
- [ ] ¿El `Omit<Tipo, ...>` del frontend excluye `id` + todos los campos calculados/automáticos?
- [ ] ¿Las variables de React/RN están en camelCase (nunca snake_case mezclado)?
- [ ] ¿Cada campo nuevo del formulario se agregó en los 4 lugares (`useState`, validación, reseteo, `startEdit`)?
- [ ] ¿Las rutas de `App.tsx` coinciden EXACTO con los links/botones que navegan a ellas?
- [ ] ¿`CORS_ALLOWED_ORIGINS` incluye todos los orígenes que vas a probar (5173, 8081)?

npx expo install react-dom react-native-web 

http://127.0.0.1:8000

CORS_ALLOWED_ORIGINS = [
    os.getenv("CORS_ORIGIN", "http://localhost:5173"),
    "http://127.0.0.1:5173",
    "http://localhost:8081",
    "http://127.0.0.1:8081",
]