from rest_framework import viewsets
from rest_framework.permissions import AllowAny
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from .models import Show, Reservation
from .serializers import ShowSerializer, ReservationSerializer
from .permissions import IsAdminOrReadOnly

class ShowViewSet(viewsets.ModelViewSet):
    queryset = Show.objects.all().order_by("id")
    serializer_class = ShowSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = ["title", "genre"]
    ordering_fields = ["id", "title"]

class ReservationViewSet(viewsets.ModelViewSet):
    queryset = Reservation.objects.select_related("show").all().order_by("-id")
    serializer_class = ReservationSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["show", "status"]
    search_fields = ["customer_name", "show__title"]
    ordering_fields = ["id", "customer_name", "total", "show_time", "created_at"]

    def get_queryset(self):
        qs = super().get_queryset()
        total_min = self.request.query_params.get("total_min")
        total_max = self.request.query_params.get("total_max")
        if total_min:
            qs = qs.filter(total__gte=total_min)
        if total_max:
            qs = qs.filter(total__lte=total_max)

        show_time_min = self.request.query_params.get("show_time_min")
        show_time_max = self.request.query_params.get("show_time_max")
        if show_time_min:
            qs = qs.filter(show_time__gte=show_time_min)
        if show_time_max:
            qs = qs.filter(show_time__lte=show_time_max)
        return qs

    def get_permissions(self):
        # Público: SOLO listar vehículos
        if self.action == "list":
            return [AllowAny()]
        return super().get_permissions()