"""
Clases de permiso reutilizables para Palta con Huevo.

Uso:
    from core.permissions import IsAdmin, IsAdminOrVendedor, IsOwnerOrAdmin, IsWhatsAppService

Jerarquía de roles: admin > vendedor > cliente
"""

from rest_framework.permissions import BasePermission
from django.conf import settings


class IsAdmin(BasePermission):
    """Solo usuarios con role='admin'."""

    message = "Se requieren permisos de administrador."

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and getattr(request.user, "role", None) == "admin"
        )


class IsAdminOrVendedor(BasePermission):
    """Usuarios con role 'admin' o 'vendedor' (staff del negocio)."""

    message = "Se requieren permisos de administrador o vendedor."

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and getattr(request.user, "role", None) in ("admin", "vendedor")
        )


class IsOwnerOrAdmin(BasePermission):
    """
    A nivel de vista: solo usuarios autenticados.
    A nivel de objeto: el propio usuario o un admin/vendedor.
    Usar junto con get_object() en vistas de detalle.
    """

    message = "No tienes permiso para acceder a este recurso."

    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        if getattr(request.user, "role", None) in ("admin", "vendedor"):
            return True
        # Soporta objetos Order (campo customer) y User (propio)
        if hasattr(obj, "customer"):
            return obj.customer == request.user
        return obj == request.user


class IsWhatsAppService(BasePermission):
    """
    Verifica que la solicitud provenga del agente WhatsApp Node.js mediante
    el header:  Authorization: Bearer <WHATSAPP_SERVICE_TOKEN>

    Si WHATSAPP_SERVICE_TOKEN no está configurado en settings, rechaza todo
    para evitar exponer el endpoint accidentalmente.
    """

    message = "Acceso restringido al servicio de WhatsApp."

    def has_permission(self, request, view):
        service_token = getattr(settings, "WHATSAPP_SERVICE_TOKEN", "")
        if not service_token:
            return False
        auth_header = request.META.get("HTTP_AUTHORIZATION", "")
        if not auth_header.startswith("Bearer "):
            return False
        token = auth_header.split(" ", 1)[1].strip()
        return token == service_token


class IsWhatsAppServiceOrAdminOrVendedor(BasePermission):
    """
    Permite acceso al agente WhatsApp (por token de servicio)
    O a usuarios con rol admin/vendedor (por token de usuario).
    Usado por AgentConfigView GET para que tanto el bot como el panel admin puedan leerlo.
    """

    message = "Acceso restringido."

    def has_permission(self, request, view):
        # Verificar token de servicio WhatsApp
        service_token = getattr(settings, "WHATSAPP_SERVICE_TOKEN", "")
        auth_header = request.META.get("HTTP_AUTHORIZATION", "")
        if service_token and auth_header.startswith("Bearer "):
            token = auth_header.split(" ", 1)[1].strip()
            if token == service_token:
                return True
        # Verificar usuario admin/vendedor autenticado
        return (
            request.user
            and request.user.is_authenticated
            and getattr(request.user, "role", None) in ("admin", "vendedor")
        )
