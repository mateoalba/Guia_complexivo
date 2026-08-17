from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import ShowViewSet, ReservationViewSet
from .movie_catalogs_views import movie_catalogs_list_create, movie_catalogs_detail
from .reservation_events_views import reservation_events_list_create, reservation_events_detail

router = DefaultRouter()
router.register(r"shows", ShowViewSet, basename="shows")
router.register(r"reservations", ReservationViewSet, basename="reservations")

urlpatterns = [
    # Mongo
    path("movie-catalogs/", movie_catalogs_list_create),
    path("movie-catalogs/<str:id>/", movie_catalogs_detail),
    path("reservation-events/", reservation_events_list_create),
    path("reservation-events/<str:id>/", reservation_events_detail),
]

urlpatterns += router.urls