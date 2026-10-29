import defaultComponents from 'fumadocs-ui/mdx';
import { InlineTOC } from 'fumadocs-ui/components/inline-toc';
import { Tab, Tabs } from 'fumadocs-ui/components/tabs';
import { TypeTable } from 'fumadocs-ui/components/type-table';
import type { MDXComponents } from 'mdx/types';
import { ArticleGallery } from './blocks/gallery';
import { ImageComparison } from './blocks/comparison';
import { ArticleVideo } from './blocks/video';
import { AnimatedClip } from './blocks/animation';
import { EventCard } from './blocks/event';
import { Metric, Milestone } from './blocks/metrics';
import { ArticleFigure, EditorialNotice, GameCard, ResourceCard } from './blocks/content';

export const editorialComponents = {
  ...defaultComponents,
  InlineTOC,
  Tab,
  Tabs,
  TypeTable,
  ArticleGallery,
  ImageComparison,
  ArticleVideo,
  AnimatedClip,
  EventCard,
  Metric,
  Milestone,
  ArticleFigure,
  EditorialNotice,
  GameCard,
  ResourceCard,
} satisfies MDXComponents;
