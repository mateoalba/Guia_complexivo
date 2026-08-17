from rest_framework import serializers
from .models import Show, Reservation

class ShowSerializer(serializers.ModelSerializer):
    class Meta:
        model = Show
        fields = ["id", "title", "genre", "duration_minutes", "rating", "is_active", "created_at"]

class ReservationSerializer(serializers.ModelSerializer):
    show_title = serializers.CharField(source="show.title", read_only=True)

    class Meta:
        model = Reservation
        fields = ["id", "show", "show_title", "customer_name", "total", "status", "show_time", "created_at"]