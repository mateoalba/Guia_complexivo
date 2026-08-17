from rest_framework import serializers

class MovieCatalogSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=120)
    genre = serializers.CharField(max_length=120)
    rating = serializers.CharField(max_length=120)
    is_featured = serializers.BooleanField(default=True)
    created_at = serializers.DateTimeField(required=False)

class ReservationEventSerializer(serializers.Serializer):
    class EventType:
        CREATED = "CREATED"
        CONFIRMED = "CONFIRMED"
        CANCELLED = "CANCELLED"
        ATTENDED = "ATTENDED"

        CHOICES = [
            (CREATED, "Created"),
            (CONFIRMED, "Confirmed"),
            (CANCELLED, "Cancelled"),
            (ATTENDED, "Attended")
        ]

    class Source:
        WEB = "WEB"
        MOBILE = "MOBILE"
        SYSTEM = "SYSTEM"

        CHOICES = [
            (WEB, "Web"),
            (MOBILE, "Mobile"),
            (SYSTEM, "System"),
        ]
    reservation_id = serializers.IntegerField()       
    event_type = serializers.ChoiceField(choices=EventType.CHOICES,default=EventType.CREATED)    
    source = serializers.ChoiceField(choices=Source.CHOICES,default=Source.WEB)    
    note = serializers.CharField(required=False, allow_blank=True)
    created_at = serializers.DateTimeField(required=False)