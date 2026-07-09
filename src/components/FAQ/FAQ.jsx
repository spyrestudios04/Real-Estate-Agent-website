import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";

import FAQItem from "./FAQItem";
import faqData from "./faqdata";

const FAQ = () => {
  const [active, setActive] = useState(0);

  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6">

        <div className="grid lg:grid-cols-2 gap-20">

          {/* Left */}

          <motion.div
            initial={{ opacity: 0, x: -60 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: .7 }}
            className="lg:sticky lg:top-24 h-fit"
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="h-[2px] w-14 bg-[#10B981]" />
              <span className="uppercase tracking-widest text-sm font-semibold text-[#10B981]">
                Frequently Asked Questions
              </span>
            </div>

            <h2 className="text-4xl lg:text-5xl font-bold text-[#1F2937] leading-tight">
              Got Questions?
              <br />
              We've Got Answers.
            </h2>

            <p className="mt-8 text-lg text-gray-600 leading-8">
              Buying or selling a property can raise many questions. Here are
              some of the most common ones our clients ask before making their
              decision.
            </p>

            <div className="mt-16">

              <h3 className="text-2xl font-semibold text-[#1F2937]">
                Still have questions?
              </h3>

              <button className="group mt-6 flex items-center gap-3 rounded-full bg-[#2563EB] px-8 py-4 font-semibold text-white transition hover:bg-[#10B981]">
                Contact Us

                <ArrowUpRight
                  size={18}
                  className="transition group-hover:translate-x-1 group-hover:-translate-y-1"
                />
              </button>

            </div>
          </motion.div>

          {/* Right */}

          <motion.div
            initial={{ opacity: 0, x: 60 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: .7 }}
          >
            {faqData.map((faq, index) => (
              <FAQItem
                key={index}
                faq={faq}
                active={active === index}
                onClick={() =>
                  setActive(active === index ? null : index)
                }
              />
            ))}
          </motion.div>

        </div>
      </div>
    </section>
  );
};

export default FAQ;
