from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('marketing', '0003_agentconfig'),
    ]

    operations = [
        migrations.AddField(
            model_name='agentconfig',
            name='whatsapp_connected_phone',
            field=models.CharField(blank=True, max_length=30),
        ),
    ]
