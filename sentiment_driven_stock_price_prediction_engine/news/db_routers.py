class AlphaNewsRouter:
    def db_for_read(self, model, **hints):
        if model._meta.app_label == 'news' and model._meta.model_name == 'alphavantagenewsarticle':
            return 'alphaNewsData'
        return None

    def db_for_write(self, model, **hints):
        if model._meta.app_label == 'news' and model._meta.model_name == 'alphavantagenewsarticle':
            return 'alphaNewsData'
        return None
