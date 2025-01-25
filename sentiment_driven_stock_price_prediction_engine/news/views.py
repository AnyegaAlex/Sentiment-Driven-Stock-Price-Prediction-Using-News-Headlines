from rest_framework.views import APIView
from rest_framework.response import Response
from .models import NewsArticle
from .serializers import NewsSerializer

class NewsListView(APIView):
    def get(self, request):
        articles = NewsArticle.objects.all().order_by('-published_at')  
        serializer = NewsSerializer(articles, many=True)
        return Response(serializer.data)