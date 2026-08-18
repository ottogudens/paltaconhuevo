import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth import get_user_model
from orders.models import Order
from django.db import transaction

User = get_user_model()

def clean_duplicates():
    print("Buscando clientes duplicados...")
    duplicates_deleted = 0
    merged_orders = 0
    
    seen_phones = {}
    seen_emails = {}
    
    # Obtenemos clientes ordenados por fecha de creación, para mantener los más antiguos como principales
    clients = User.objects.filter(role='cliente').order_by('created_at')
    
    for client in clients:
        is_duplicate = False
        primary_client = None
        
        email = client.email.lower().strip() if client.email else ""
        # Ignorar correos ficticios generados por whatsapp
        if "@whatsapp.cl" in email:
            email = ""
            
        def normalize_phone(p):
            digits = ''.join(filter(str.isdigit, str(p or '')))
            if len(digits) >= 9:
                return digits[-9:]
            return digits if digits else None

        phone = normalize_phone(client.phone)
        whatsapp = normalize_phone(client.whatsapp_number)
        
        # Buscamos si ya existe
        if email and email in seen_emails:
            is_duplicate = True
            primary_client = seen_emails[email]
        elif phone and phone in seen_phones:
            is_duplicate = True
            primary_client = seen_phones[phone]
        elif whatsapp and whatsapp in seen_phones:
            is_duplicate = True
            primary_client = seen_phones[whatsapp]
        if is_duplicate and primary_client:
            print(f"Duplicado encontrado: {client.username} (ID: {client.id}) -> Manteniendo ID: {primary_client.id}")
            
            with transaction.atomic():
                # Traspasar pedidos del cliente duplicado al principal antes de borrar
                client_orders = Order.objects.filter(user=client)
                for order in client_orders:
                    order.user = primary_client
                    order.save()
                    merged_orders += 1
                
                # Traspasar cuenta de lealtad si aplica (puntos)
                try:
                    from loyalty.models import LoyaltyAccount
                    dup_loyalty = LoyaltyAccount.objects.filter(user=client).first()
                    prim_loyalty = LoyaltyAccount.objects.filter(user=primary_client).first()
                    
                    if dup_loyalty and prim_loyalty:
                        prim_loyalty.points += dup_loyalty.points
                        prim_loyalty.save()
                except Exception as e:
                    pass
                
                # Eliminar el cliente duplicado
                client.delete()
                duplicates_deleted += 1
        else:
            # Registrar al cliente primario en nuestros diccionarios de control
            if email:
                seen_emails[email] = client
            if phone:
                seen_phones[phone] = client
            if whatsapp:
                seen_phones[whatsapp] = client

    print(f"\nProceso finalizado:")
    print(f"- Clientes duplicados eliminados: {duplicates_deleted}")
    print(f"- Pedidos reasignados al cliente principal: {merged_orders}")

if __name__ == '__main__':
    clean_duplicates()
