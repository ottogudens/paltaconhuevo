from rest_framework import serializers
from .models import Product, Purchase, ProductComponent

class ProductComponentSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_type = serializers.CharField(source='product.product_type', read_only=True)
    unit = serializers.CharField(source='product.unit', read_only=True)
    
    class Meta:
        model = ProductComponent
        fields = ['id', 'product', 'product_name', 'product_type', 'unit', 'quantity']

class ProductSerializer(serializers.ModelSerializer):
    components = ProductComponentSerializer(many=True, required=False)

    class Meta:
        model = Product
        fields = '__all__'

    def to_internal_value(self, data):
        import json

        # Si la petición viene como multipart/form-data, `data` es un QueryDict.
        # QueryDict.setlist() almacena los valores como strings, lo que hace que
        # los dicts del nested serializer 'components' se pierdan.
        # Solución: convertir a dict plano de Python antes de llamar al parent.
        if hasattr(data, '_mutable'):  # Es un QueryDict
            components_raw = data.get('components')
            # Construir dict plano preservando todos los campos excepto 'components'
            plain_data = {key: data[key] for key in data}

            # Parsear 'components' de JSON string → lista de dicts
            if components_raw is not None:
                try:
                    parsed = json.loads(components_raw) if isinstance(components_raw, str) else components_raw
                    plain_data['components'] = parsed if isinstance(parsed, list) else []
                except (ValueError, TypeError):
                    plain_data['components'] = []

            data = plain_data

        return super().to_internal_value(data)

    def to_representation(self, instance):
        repr_data = super().to_representation(instance)
        if instance.is_bundle:
            import math
            total_cost = 0
            possible_assemblies = []
            
            for comp in instance.components.all():
                comp_cost = comp.product.purchase_price if comp.product.purchase_price else 0
                total_cost += float(comp_cost) * float(comp.quantity)
                
                if comp.quantity > 0:
                    possible_assemblies.append(float(comp.product.stock) / float(comp.quantity))
            
            repr_data['purchase_price'] = str(round(total_cost))
            if possible_assemblies:
                # Stock can't be negative for computation mapping to positive assemblies,
                # but if any component has negative stock, this evaluates to negative.
                repr_data['stock'] = str(math.floor(min(possible_assemblies))) if min(possible_assemblies) > 0 else "0"
            else:
                repr_data['stock'] = "0"
                
        return repr_data

    def create(self, validated_data):
        components_data = validated_data.pop('components', [])
        product = Product.objects.create(**validated_data)
        if product.is_bundle:
            for component_data in components_data:
                ProductComponent.objects.create(bundle=product, **component_data)
        return product

    def update(self, instance, validated_data):
        components_data = validated_data.pop('components', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if instance.is_bundle and components_data is not None:
            # Eliminar antiguos y recrear
            instance.components.all().delete()
            for component_data in components_data:
                ProductComponent.objects.create(bundle=instance, **component_data)
        
        return instance

class PurchaseSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    class Meta:
        model = Purchase
        fields = '__all__'
