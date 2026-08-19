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
