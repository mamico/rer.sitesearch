# -*- coding: utf-8 -*-
from Products.CMFCore.utils import getToolByName
from rer.sitesearch import logger
from rer.sitesearch.interfaces import IRERSiteSearchSettings
from zope.component import queryUtility
from rer.sitesearch.custom_fields import TabsValueField, IndexesValueField
from plone.registry.interfaces import IRegistry
from rer.sitesearch.setuphandlers import DEFAULT_HIDDEN_INDEXES, DEFAULT_INDEXES, DEFAULT_TABS
from rer.sitesearch.setuphandlers import setRegistyIndexes as defaultSetRegistryIndex
from rer.sitesearch.setuphandlers import setRegistryTabs as defaultSetRegistyTabs
from zope.schema.interfaces import IVocabularyFactory

default_profile = 'profile-rer.sitesearch:default'
uninstall_profile = 'profile-rer.sitesearch:uninstall'


def upgrade(upgrade_product, version):
    """ Decorator for updating the QuickInstaller of a upgrade """
    def wrap_func(fn):
        def wrap_func_args(context, *args):
            p = getToolByName(context, 'portal_quickinstaller').get(upgrade_product)
            setattr(p, 'installedversion', version)
            return fn(context, *args)
        return wrap_func_args
    return wrap_func


@upgrade('rer.sitesearch', '1.6.0')
def to_1_6_0(context):
    """
    """
    logger.info('Upgrading rer.sitesearch to version 1.6.0')
    context.runImportStepFromProfile(default_profile, 'rolemap')
    context.runImportStepFromProfile(default_profile, 'controlpanel')
    logger.info('Reinstalled rolemap and controlpanel')


@upgrade('rer.sitesearch', '2.0.3')
def to_2(context):
    """
    """
    logger.info('Upgrading rer.sitesearch to version 2')
    context.runImportStepFromProfile(default_profile, 'browserlayer')
    context.runImportStepFromProfile(uninstall_profile, 'skins')
    logger.info('Removed skins')


@upgrade('rer.sitesearch', '2.3.0')
def to_230(context):
    """
    """
    logger.info('Upgrading rer.sitesearch to version 230')
    context.runAllImportStepsFromProfile("profile-rer.sitesearch:migrate_to_230")
    context.runImportStepFromProfile(default_profile, 'plone.app.registry')
    context.runImportStepFromProfile(default_profile, 'cssregistry', run_dependencies=False)
    updateRegistryFromProperties(context)
    logger.info('Migrated settings from properties to registry')


@upgrade('rer.sitesearch', '2.4.0')
def to_240(context):
    """
    """
    logger.info('Upgrading rer.sitesearch to version 240')
    context.runImportStepFromProfile(default_profile, 'plone.app.registry')
    context.runImportStepFromProfile(default_profile, 'controlpanel')
    logger.info('Upgraded for solr support and fix controlpanel icon')


def updateRegistryFromProperties(context):
    """
    Copy settings from old site properties to new plone.registry
    """
    logger.info('Migration from site_properties settings to registry')
    portal_properties = getToolByName(context, 'portal_properties')
    rer_properties = getattr(portal_properties, 'rer_properties', None)
    if not rer_properties:
        logger.info('No RER settings found. Migration skipped')
        return
    registry = queryUtility(IRegistry)
    settings = registry.forInterface(IRERSiteSearchSettings, check=False)
    indexes_in_search = rer_properties.getProperty('indexes_in_search', ())
    tabs_list = rer_properties.getProperty('tabs_list', ())
    indexes_hiddenlist = rer_properties.getProperty('indexes_hiddenlist', ())
    if not indexes_in_search:
        indexes = defaultSetRegistryIndex(context, DEFAULT_INDEXES)
        settings.available_indexes = indexes
    else:
        new_indexes = setRegistyIndexes(context, indexes_in_search)
        settings.available_indexes += new_indexes
    if not indexes_hiddenlist:
        indexes = defaultSetRegistryIndex(context, DEFAULT_HIDDEN_INDEXES)
        settings.hidden_indexes = indexes
    else:
        new_indexes = setRegistyIndexes(context, indexes_hiddenlist)
        settings.hidden_indexes += new_indexes
    if not tabs_list:
        tabs = defaultSetRegistyTabs(context)
        settings.tabs_mapping = tabs
        tabs_order_dict = queryUtility(IVocabularyFactory, name="rer.sitesearch.vocabularies.SearchTabsVocabulary")
        tabs_order = tabs_order_dict(context).by_token.keys()
        settings.tabs_order = tuple(tabs_order)
    else:
        tabs, tabs_order = setRegistryTabs(context, tabs_list)
        new_tabs = []
        for tab in tabs.keys():
            new_value = TabsValueField()
            new_value.tab_title = tab
            new_value.portal_types = tuple(tabs.get(tab))
            new_tabs.append(new_value)
        settings.tabs_mapping += tuple(new_tabs)
        settings.tabs_order = tabs_order


def setRegistyIndexes(context, indexes):
    """
    """
    pc = getToolByName(context, 'portal_catalog')
    catalog_indexes = pc.indexes()
    new_items = []
    for index in indexes:
        values = splitOptions(index)
        if values.get('id', '') in catalog_indexes:
            new_value = IndexesValueField()
            new_value.index = values.get('id', '')
            new_value.index_title = values.get('title', '')
            new_items.append(new_value)
    return tuple(new_items)


def setRegistryTabs(context, property_value):
    """
    """
    results_dict = {}
    types_tool = getToolByName(context, 'portal_types')
    portal_types = types_tool.listContentTypes()
    tabs_order = set()
    for value in property_value:
        values_dict = splitOptions(value)
        value_id = values_dict.get('id', '')
        value_title = values_dict.get('title', '')
        tabs_order.add(value_title)
        if value_id in portal_types:
            if not value_title in results_dict:
                results_dict[value_title] = [value_id]
            else:
                results_dict[value_title].append(value_id)
    return results_dict, tuple(tabs_order)


def splitOptions(value):
        """
        This method returns key and value. If there isn't a value, return the key as value
        @param: value is a string that contain a key and a value divided by "pipe" character
        """
        key_info = value.split('|')
        if len(key_info) == 2:
            return {'id': key_info[0], 'title': key_info[1]}
        else:
            return {'id': key_info[0], 'title': key_info[0]}
