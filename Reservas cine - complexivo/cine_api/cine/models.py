from django.db import models

class Show(models.Model):
    title = models.CharField(max_length=120)
    genre = models.CharField(max_length=120)
    duration_minutes = models.IntegerField()  
    rating = models.CharField(max_length=120)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title

class Reservation(models.Model):
    class Status(models.TextChoices):
        RESERVED = "RESERVED", "Reserved"
        CONFIRMED = "CONFIRMED", "Confirmed"
        CANCELLED = "CANCELLED", "Cancelled"
        ATTENDED = "ATTENDED", "Attended"

    show = models.ForeignKey(Show, on_delete=models.PROTECT, related_name="reservations")
    customer_name = models.CharField(max_length=120)
    total = models.DecimalField(max_digits=10,decimal_places=2)
    status = models.CharField(max_length=20,choices=Status.choices,default=Status.RESERVED)
    show_time = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.show.title} {self.customer_name} ({self.status})"